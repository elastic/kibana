/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIssueAggregator, type GitHubIssue } from './issue_aggregator';

const createMockIssue = (overrides: Partial<GitHubIssue> = {}): GitHubIssue => ({
  id: Math.floor(Math.random() * 1000000),
  number: Math.floor(Math.random() * 10000),
  title: 'Test Issue',
  body: 'Test issue body',
  html_url: 'https://github.com/elastic/kibana/issues/1',
  state: 'open',
  labels: [],
  user: {
    id: 1,
    login: 'testuser',
  },
  comments: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  repository_url: 'https://api.github.com/repos/elastic/kibana',
  ...overrides,
});

describe('createIssueAggregator', () => {
  describe('aggregate', () => {
    it('should deduplicate issues with the same repository and number', () => {
      const aggregator = createIssueAggregator();

      const issue1 = createMockIssue({
        number: 123,
        html_url: 'https://github.com/elastic/kibana/issues/123',
        repository_url: 'https://api.github.com/repos/elastic/kibana',
      });

      const issue2 = createMockIssue({
        number: 123,
        html_url: 'https://github.com/elastic/kibana/issues/123',
        repository_url: 'https://api.github.com/repos/elastic/kibana',
      });

      const result = aggregator.aggregate([issue1, issue2]);

      expect(result.summary.totalInputIssues).toBe(2);
      expect(result.summary.uniqueIssues).toBe(1);
      expect(result.summary.duplicatesRemoved).toBe(1);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].occurrenceCount).toBe(2);
    });

    it('should keep issues from different repositories as separate', () => {
      const aggregator = createIssueAggregator();

      const issue1 = createMockIssue({
        number: 123,
        html_url: 'https://github.com/elastic/kibana/issues/123',
        repository_url: 'https://api.github.com/repos/elastic/kibana',
      });

      const issue2 = createMockIssue({
        number: 123,
        html_url: 'https://github.com/elastic/elasticsearch/issues/123',
        repository_url: 'https://api.github.com/repos/elastic/elasticsearch',
      });

      const result = aggregator.aggregate([issue1, issue2]);

      expect(result.summary.uniqueIssues).toBe(2);
      expect(result.summary.duplicatesRemoved).toBe(0);
      expect(result.issues).toHaveLength(2);
    });

    it('should rank issues with more reactions higher', () => {
      const aggregator = createIssueAggregator({
        reactionsWeight: 1,
        commentsWeight: 0,
        recencyWeight: 0,
        searchScoreWeight: 0,
        labelWeight: 0,
      });

      const lowReactions = createMockIssue({
        number: 1,
        html_url: 'https://github.com/elastic/kibana/issues/1',
        reactions: {
          total_count: 1,
          '+1': 1,
          '-1': 0,
          laugh: 0,
          hooray: 0,
          confused: 0,
          heart: 0,
          rocket: 0,
          eyes: 0,
        },
      });

      const highReactions = createMockIssue({
        number: 2,
        html_url: 'https://github.com/elastic/kibana/issues/2',
        reactions: {
          total_count: 50,
          '+1': 30,
          '-1': 0,
          laugh: 5,
          hooray: 5,
          confused: 0,
          heart: 10,
          rocket: 0,
          eyes: 0,
        },
      });

      const result = aggregator.aggregate([lowReactions, highReactions]);

      expect(result.issues[0].number).toBe(2); // High reactions should be first
      expect(result.issues[1].number).toBe(1);
    });

    it('should rank issues with more comments higher', () => {
      const aggregator = createIssueAggregator({
        reactionsWeight: 0,
        commentsWeight: 1,
        recencyWeight: 0,
        searchScoreWeight: 0,
        labelWeight: 0,
      });

      const fewComments = createMockIssue({
        number: 1,
        html_url: 'https://github.com/elastic/kibana/issues/1',
        comments: 1,
      });

      const manyComments = createMockIssue({
        number: 2,
        html_url: 'https://github.com/elastic/kibana/issues/2',
        comments: 50,
      });

      const result = aggregator.aggregate([fewComments, manyComments]);

      expect(result.issues[0].number).toBe(2); // Many comments should be first
    });

    it('should rank more recent issues higher', () => {
      const aggregator = createIssueAggregator({
        reactionsWeight: 0,
        commentsWeight: 0,
        recencyWeight: 1,
        searchScoreWeight: 0,
        labelWeight: 0,
      });

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);

      const oldIssue = createMockIssue({
        number: 1,
        html_url: 'https://github.com/elastic/kibana/issues/1',
        updated_at: oldDate.toISOString(),
      });

      const recentIssue = createMockIssue({
        number: 2,
        html_url: 'https://github.com/elastic/kibana/issues/2',
        updated_at: new Date().toISOString(),
      });

      const result = aggregator.aggregate([oldIssue, recentIssue]);

      expect(result.issues[0].number).toBe(2); // Recent issue should be first
    });

    it('should boost issues with priority labels', () => {
      const aggregator = createIssueAggregator({
        reactionsWeight: 0,
        commentsWeight: 0,
        recencyWeight: 0,
        searchScoreWeight: 0,
        labelWeight: 1,
      });

      const noLabels = createMockIssue({
        number: 1,
        html_url: 'https://github.com/elastic/kibana/issues/1',
        labels: [],
      });

      const priorityLabel = createMockIssue({
        number: 2,
        html_url: 'https://github.com/elastic/kibana/issues/2',
        labels: [{ id: 1, name: 'bug', color: 'red' }],
      });

      const result = aggregator.aggregate([noLabels, priorityLabel]);

      expect(result.issues[0].number).toBe(2); // Priority label should be first
    });

    it('should boost open issues when preferOpen is true', () => {
      const aggregator = createIssueAggregator({ preferOpen: true, openIssueBoost: 2.0 });

      const closedIssue = createMockIssue({
        number: 1,
        html_url: 'https://github.com/elastic/kibana/issues/1',
        state: 'closed',
        reactions: {
          total_count: 10,
          '+1': 10,
          '-1': 0,
          laugh: 0,
          hooray: 0,
          confused: 0,
          heart: 0,
          rocket: 0,
          eyes: 0,
        },
      });

      const openIssue = createMockIssue({
        number: 2,
        html_url: 'https://github.com/elastic/kibana/issues/2',
        state: 'open',
        reactions: {
          total_count: 5,
          '+1': 5,
          '-1': 0,
          laugh: 0,
          hooray: 0,
          confused: 0,
          heart: 0,
          rocket: 0,
          eyes: 0,
        },
      });

      const result = aggregator.aggregate([closedIssue, openIssue]);

      // Open issue should be ranked higher due to boost
      expect(result.issues[0].state).toBe('open');
    });

    it('should respect maxIssues configuration', () => {
      const aggregator = createIssueAggregator({ maxIssues: 2 });

      const issues = [
        createMockIssue({ number: 1, html_url: 'https://github.com/elastic/kibana/issues/1' }),
        createMockIssue({ number: 2, html_url: 'https://github.com/elastic/kibana/issues/2' }),
        createMockIssue({ number: 3, html_url: 'https://github.com/elastic/kibana/issues/3' }),
        createMockIssue({ number: 4, html_url: 'https://github.com/elastic/kibana/issues/4' }),
      ];

      const result = aggregator.aggregate(issues);

      expect(result.issues).toHaveLength(2);
    });

    it('should track label counts in summary', () => {
      const aggregator = createIssueAggregator();

      const issues = [
        createMockIssue({
          number: 1,
          html_url: 'https://github.com/elastic/kibana/issues/1',
          labels: [{ id: 1, name: 'bug' }],
        }),
        createMockIssue({
          number: 2,
          html_url: 'https://github.com/elastic/kibana/issues/2',
          labels: [
            { id: 1, name: 'bug' },
            { id: 2, name: 'enhancement' },
          ],
        }),
        createMockIssue({
          number: 3,
          html_url: 'https://github.com/elastic/kibana/issues/3',
          labels: [{ id: 2, name: 'enhancement' }],
        }),
      ];

      const result = aggregator.aggregate(issues);

      expect(result.summary.topLabels).toContainEqual({ name: 'bug', count: 2 });
      expect(result.summary.topLabels).toContainEqual({ name: 'enhancement', count: 2 });
    });

    it('should include score breakdown for each issue', () => {
      const aggregator = createIssueAggregator();

      const issue = createMockIssue({
        number: 1,
        html_url: 'https://github.com/elastic/kibana/issues/1',
        comments: 10,
        reactions: {
          total_count: 5,
          '+1': 5,
          '-1': 0,
          laugh: 0,
          hooray: 0,
          confused: 0,
          heart: 0,
          rocket: 0,
          eyes: 0,
        },
      });

      const result = aggregator.aggregate([issue]);

      expect(result.issues[0].scoreBreakdown).toBeDefined();
      expect(result.issues[0].scoreBreakdown.reactionsScore).toBeGreaterThan(0);
      expect(result.issues[0].scoreBreakdown.commentsScore).toBeGreaterThan(0);
      expect(result.issues[0].scoreBreakdown.recencyScore).toBeGreaterThan(0);
    });
  });

  describe('aggregateMultiple', () => {
    it('should aggregate issues from multiple search results', () => {
      const aggregator = createIssueAggregator();

      const searchResult1 = {
        issues: [
          createMockIssue({ number: 1, html_url: 'https://github.com/elastic/kibana/issues/1' }),
          createMockIssue({ number: 2, html_url: 'https://github.com/elastic/kibana/issues/2' }),
        ],
        query: 'bug',
        repository: 'elastic/kibana',
      };

      const searchResult2 = {
        issues: [
          createMockIssue({ number: 2, html_url: 'https://github.com/elastic/kibana/issues/2' }), // Duplicate
          createMockIssue({ number: 3, html_url: 'https://github.com/elastic/kibana/issues/3' }),
        ],
        query: 'error',
        repository: 'elastic/kibana',
      };

      const result = aggregator.aggregateMultiple([searchResult1, searchResult2]);

      expect(result.summary.totalInputIssues).toBe(4);
      expect(result.summary.uniqueIssues).toBe(3);
      expect(result.summary.duplicatesRemoved).toBe(1);

      // Issue #2 should have occurrence count of 2
      const issue2 = result.issues.find((i) => i.number === 2);
      expect(issue2?.occurrenceCount).toBe(2);
    });

    it('should track sources for each issue', () => {
      const aggregator = createIssueAggregator();

      const searchResult1 = {
        issues: [
          createMockIssue({ number: 1, html_url: 'https://github.com/elastic/kibana/issues/1' }),
        ],
        query: 'bug',
        repository: 'elastic/kibana',
      };

      const searchResult2 = {
        issues: [
          createMockIssue({ number: 1, html_url: 'https://github.com/elastic/kibana/issues/1' }),
        ],
        query: 'error',
        repository: 'elastic/kibana',
      };

      const result = aggregator.aggregateMultiple([searchResult1, searchResult2]);

      expect(result.issues[0].sources).toHaveLength(2);
      expect(result.issues[0].sources[0].query).toBe('bug');
      expect(result.issues[0].sources[1].query).toBe('error');
    });
  });

  describe('areDuplicates', () => {
    it('should return true for same repo and number', () => {
      const aggregator = createIssueAggregator();

      const issue1 = createMockIssue({
        number: 123,
        html_url: 'https://github.com/elastic/kibana/issues/123',
      });

      const issue2 = createMockIssue({
        number: 123,
        html_url: 'https://github.com/elastic/kibana/issues/123',
      });

      expect(aggregator.areDuplicates(issue1, issue2)).toBe(true);
    });

    it('should return false for different issue numbers', () => {
      const aggregator = createIssueAggregator();

      const issue1 = createMockIssue({
        number: 123,
        html_url: 'https://github.com/elastic/kibana/issues/123',
      });

      const issue2 = createMockIssue({
        number: 456,
        html_url: 'https://github.com/elastic/kibana/issues/456',
      });

      expect(aggregator.areDuplicates(issue1, issue2)).toBe(false);
    });

    it('should return false for same number but different repos', () => {
      const aggregator = createIssueAggregator();

      const issue1 = createMockIssue({
        number: 123,
        html_url: 'https://github.com/elastic/kibana/issues/123',
        repository_url: 'https://api.github.com/repos/elastic/kibana',
      });

      const issue2 = createMockIssue({
        number: 123,
        html_url: 'https://github.com/elastic/elasticsearch/issues/123',
        repository_url: 'https://api.github.com/repos/elastic/elasticsearch',
      });

      expect(aggregator.areDuplicates(issue1, issue2)).toBe(false);
    });
  });

  describe('rank', () => {
    it('should rank issues by computed score', () => {
      const aggregator = createIssueAggregator();

      const lowScore = createMockIssue({
        number: 1,
        html_url: 'https://github.com/elastic/kibana/issues/1',
        comments: 0,
      });

      const highScore = createMockIssue({
        number: 2,
        html_url: 'https://github.com/elastic/kibana/issues/2',
        comments: 100,
        reactions: {
          total_count: 50,
          '+1': 30,
          '-1': 0,
          laugh: 5,
          hooray: 5,
          confused: 0,
          heart: 10,
          rocket: 0,
          eyes: 0,
        },
      });

      const ranked = aggregator.rank([lowScore, highScore]);

      expect(ranked[0].number).toBe(2);
      expect(ranked[1].number).toBe(1);
    });
  });

  describe('deduplicate', () => {
    it('should remove duplicates while preserving order', () => {
      const aggregator = createIssueAggregator();

      const issue1 = createMockIssue({
        number: 1,
        html_url: 'https://github.com/elastic/kibana/issues/1',
      });

      const issue2 = createMockIssue({
        number: 2,
        html_url: 'https://github.com/elastic/kibana/issues/2',
      });

      const issue1Duplicate = createMockIssue({
        number: 1,
        html_url: 'https://github.com/elastic/kibana/issues/1',
      });

      const deduplicated = aggregator.deduplicate([issue1, issue2, issue1Duplicate]);

      expect(deduplicated).toHaveLength(2);
      expect(deduplicated[0].number).toBe(1);
      expect(deduplicated[1].number).toBe(2);
    });
  });

  describe('generateIssueKey', () => {
    it('should generate consistent keys for the same issue', () => {
      const aggregator = createIssueAggregator();

      const issue1 = createMockIssue({
        number: 123,
        html_url: 'https://github.com/elastic/kibana/issues/123',
        repository_url: 'https://api.github.com/repos/elastic/kibana',
      });

      const issue2 = createMockIssue({
        number: 123,
        html_url: 'https://github.com/elastic/kibana/issues/123',
        repository_url: 'https://api.github.com/repos/elastic/kibana',
      });

      expect(aggregator.generateIssueKey(issue1)).toBe(aggregator.generateIssueKey(issue2));
    });

    it('should generate different keys for different issues', () => {
      const aggregator = createIssueAggregator();

      const issue1 = createMockIssue({
        number: 123,
        html_url: 'https://github.com/elastic/kibana/issues/123',
      });

      const issue2 = createMockIssue({
        number: 456,
        html_url: 'https://github.com/elastic/kibana/issues/456',
      });

      expect(aggregator.generateIssueKey(issue1)).not.toBe(aggregator.generateIssueKey(issue2));
    });
  });
});
