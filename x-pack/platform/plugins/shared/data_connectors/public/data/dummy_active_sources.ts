/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActiveSource } from '../types/connector';

// TODO: This is temporary dummy data. Replace with API integration when backend is ready.
export const DUMMY_ACTIVE_SOURCES: ActiveSource[] = [
  {
    id: 'routemap-1',
    name: 'Routemap',
    type: 'Jira',
    connectedAs: 'admin@company.com',
    createdAt: '2024-01-15T09:30:00Z',
    usedBy: [
      { id: 'agent1', name: 'Customer Support Agent', color: '#006BB4', symbol: 'help' },
      { id: 'agent2', name: 'Sales Assistant', color: '#BD271E' }, // No symbol - will show initials "SA"
    ],
  },
  {
    id: 'client-feedback-1',
    name: 'Client feedback',
    type: 'Salesforce',
    connectedAs: 'sales@company.com',
    createdAt: '2024-02-10T14:20:00Z',
    usedBy: [
      { id: 'agent3', name: 'Marketing Agent', color: '#017D73' }, // No symbol - will show "MA"
      { id: 'agent4', name: 'Product Research Agent', color: '#F04E98', symbol: 'beaker' },
      { id: 'agent20', name: 'Sales Operations Agent', color: '#F5A700' }, // No symbol - will show "SO"
    ],
  },
  {
    id: 'documentation-1',
    name: 'Documentation',
    type: 'File import',
    connectedAs: 'docs@company.com',
    createdAt: '2024-03-05T10:15:00Z',
    usedBy: [
      { id: 'agent5', name: 'Technical Writer Agent', color: '#6092C0', symbol: 'document' },
      { id: 'agent6', name: 'Code Review Agent', color: '#DD0A73', symbol: 'branch' },
      { id: 'agent7', name: 'QA Testing Agent', color: '#490092', symbol: 'bug' },
      { id: 'agent21', name: 'Documentation Manager', color: '#00BFB3' }, // 4th agent - will show in +1 tooltip
    ],
  },
  {
    id: 'marketing-site-1',
    name: 'Marketing Site Info',
    type: 'Web crawler',
    connectedAs: 'marketing@company.com',
    createdAt: '2024-04-20T16:45:00Z',
    usedBy: [
      { id: 'agent8', name: 'SEO Optimizer Agent', color: '#00BFB3' }, // No symbol - will show "SO"
      { id: 'agent9', name: 'Content Curator Agent', color: '#FEC514', symbol: 'newspaper' },
      { id: 'agent10', name: 'Social Media Agent', color: '#F66' }, // No symbol - will show "SM"
      { id: 'agent22', name: 'Brand Manager', color: '#920000' }, // 4th - in tooltip
      { id: 'agent23', name: 'Analytics Agent', color: '#4CBCE4', symbol: 'visBarVertical' }, // 5th - in tooltip
    ],
  },
  {
    id: 'team-chat-1',
    name: 'Team Chat',
    type: 'Slack',
    connectedAs: 'team@company.com',
    createdAt: '2024-05-12T08:00:00Z',
    usedBy: [
      { id: 'agent11', name: 'HR Assistant Agent', color: '#920000' }, // No symbol - will show "HA"
      { id: 'agent12', name: 'Project Manager Agent', color: '#0077CC', symbol: 'calendar' },
    ],
  },
  {
    id: 'product-bugs-1',
    name: 'Product bugs 1',
    type: 'Github',
    connectedAs: 'github-bot',
    createdAt: '2024-06-08T13:30:00Z',
    usedBy: [
      { id: 'agent13', name: 'Bug Tracker Agent', color: '#E7664C', symbol: 'alert' },
      { id: 'agent14', name: 'DevOps Agent', color: '#54B399' }, // No symbol - will show "DA"
      { id: 'agent24', name: 'Release Manager', color: '#DD0A73' }, // No symbol - will show "RM"
      { id: 'agent25', name: 'Infrastructure Agent', color: '#490092', symbol: 'compute' }, // 4th - in tooltip
    ],
  },
  {
    id: 'product-bugs-2',
    name: 'Product bugs 2',
    type: 'Github',
    connectedAs: 'github-bot',
    createdAt: '2024-07-22T11:10:00Z',
    usedBy: [
      { id: 'agent15', name: 'Performance Monitor Agent', color: '#0079A5', symbol: 'visGauge' },
      { id: 'agent16', name: 'Security Audit Agent', color: '#920000' }, // No symbol - will show "SA"
    ],
  },
  {
    id: 'product-bugs-3',
    name: 'Product bugs 3',
    type: 'Github',
    connectedAs: 'github-bot',
    createdAt: '2024-08-15T15:25:00Z',
    usedBy: [
      { id: 'agent17', name: 'API Documentation Agent', color: '#6092C0' }, // No symbol - will show "AD"
    ],
  },
  {
    id: 'product-bugs-4',
    name: 'Product bugs 4',
    type: 'Github',
    connectedAs: 'dev@company.com',
    createdAt: '2024-09-30T09:50:00Z',
    usedBy: [
      { id: 'agent18', name: 'Data Analytics Agent', color: '#D6BF57', symbol: 'visBarVertical' },
    ],
  },
  {
    id: 'product-bugs-5',
    name: 'Product bugs 5',
    type: 'Github',
    connectedAs: 'dev@company.com',
    createdAt: '2024-11-18T12:40:00Z',
    usedBy: [{ id: 'agent19', name: 'Deployment Agent', color: '#017D73' }], // No symbol - will show "DA"
  },
];
