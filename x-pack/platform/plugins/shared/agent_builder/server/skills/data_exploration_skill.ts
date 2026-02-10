/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

/**
 * Built-in skill that provides guidance for exploring and analyzing data
 * using Elasticsearch and Kibana.
 */
export const dataExplorationSkill = defineSkillType({
  id: 'data-exploration',
  name: 'data-exploration',
  basePath: 'skills/platform',
  description:
    'Guides agents through exploring, querying, and summarizing data stored in Elasticsearch using available tools.',
  content: `# Data Exploration Guide

## Overview

Use this skill to help users explore data stored in Elasticsearch indices.
Follow the steps below to provide structured, accurate answers.

## Process

### 1. Identify the Data Source
- Ask the user which index or data view they want to explore.
- If they are unsure, list the available indices.

### 2. Understand the Query
- Clarify what the user is looking for: specific documents, aggregations, or patterns.
- Determine the time range, filters, and fields of interest.

### 3. Run the Query
- Construct an appropriate Elasticsearch query.
- Use available tools to execute the query and retrieve results.

### 4. Summarize the Results
- Present findings in a clear and concise format.
- Highlight key patterns, outliers, or notable values.
- Suggest follow-up queries or visualizations if relevant.

## Best Practices
- Always confirm the index and time range before running queries.
- Start with broad queries and narrow down based on user feedback.
- Present results with context so the user can take action.`,
});
