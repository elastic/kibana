/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSplitPanel } from '@elastic/eui';
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import { workflowYamlDiffAttachmentUiDefinition } from './workflow_yaml_diff_attachment_renderer';

const BEFORE_YAML = `name: Open PRs Report for Team One Workflow
description: Daily report of team "TeamOne Workflow" PRs from elastic/kibana.

enabled: true
tags:
  - github
  - team-one-workflow

consts:
  github_search_url: "https://api.github.com/search/issues?q=is%3Apr+label%3A%22Team%3AOne+Workflow%22+is%3Aopen+repo%3Aelastic%2Fkibana&per_page=100"
  # slack_webhook_url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

triggers:
  - type: scheduled
    with:
      rule:
        freq: DAILY
        interval: 1
        byhour: [9]
        byminute: [0]
        tzid: UTC

steps:
  - name: get_prs_from_github
    type: http.request
    with:
      url: "{{ consts.github_search_url }}"
      method: GET
      headers:
        Accept: "application/vnd.github.v3+json"
        User-Agent: "ElasticWorkflow/1.0"

  - name: log_count
    type: console
    with:
      message: "Found {{ steps.get_prs_from_github.output.total_count }} open PRs"

  - name: iterate_prs
    type: foreach
    foreach: steps.get_prs_from_github.output.items
    steps:
      - name: log_pr
        type: console
        with:
          message: "#{{ steps.iterate_prs.item.number }} - {{ steps.iterate_prs.item.title }}"
`;

const AFTER_DELETE_CONST = `name: Open PRs Report for Team One Workflow
description: Daily report of team "TeamOne Workflow" PRs from elastic/kibana.

enabled: true
tags:
  - github
  - team-one-workflow

consts:
  github_search_url: "https://api.github.com/search/issues?q=is%3Apr+label%3A%22Team%3AOne+Workflow%22+is%3Aopen+repo%3Aelastic%2Fkibana&per_page=100"

triggers:
  - type: scheduled
    with:
      rule:
        freq: DAILY
        interval: 1
        byhour: [9]
        byminute: [0]
        tzid: UTC

steps:
  - name: get_prs_from_github
    type: http.request
    with:
      url: "{{ consts.github_search_url }}"
      method: GET
      headers:
        Accept: "application/vnd.github.v3+json"
        User-Agent: "ElasticWorkflow/1.0"

  - name: log_count
    type: console
    with:
      message: "Found {{ steps.get_prs_from_github.output.total_count }} open PRs"

  - name: iterate_prs
    type: foreach
    foreach: steps.get_prs_from_github.output.items
    steps:
      - name: log_pr
        type: console
        with:
          message: "#{{ steps.iterate_prs.item.number }} - {{ steps.iterate_prs.item.title }}"
`;

const AFTER_ADD_STEP = `name: Open PRs Report for Team One Workflow
description: Daily report of team "TeamOne Workflow" PRs from elastic/kibana.

enabled: true
tags:
  - github
  - team-one-workflow

consts:
  github_search_url: "https://api.github.com/search/issues?q=is%3Apr+label%3A%22Team%3AOne+Workflow%22+is%3Aopen+repo%3Aelastic%2Fkibana&per_page=100"
  # slack_webhook_url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

triggers:
  - type: scheduled
    with:
      rule:
        freq: DAILY
        interval: 1
        byhour: [9]
        byminute: [0]
        tzid: UTC

steps:
  - name: get_prs_from_github
    type: http.request
    with:
      url: "{{ consts.github_search_url }}"
      method: GET
      headers:
        Accept: "application/vnd.github.v3+json"
        User-Agent: "ElasticWorkflow/1.0"

  - name: log_count
    type: console
    with:
      message: "Found {{ steps.get_prs_from_github.output.total_count }} open PRs"

  - name: iterate_prs
    type: foreach
    foreach: steps.get_prs_from_github.output.items
    steps:
      - name: log_pr
        type: console
        with:
          message: "#{{ steps.iterate_prs.item.number }} - {{ steps.iterate_prs.item.title }}"

  - name: notify_slack
    type: slack
    connector-id: my-slack
    with:
      message: "Found {{ steps.get_prs_from_github.output.total_count }} open PRs for Team One"
`;

const AFTER_RENAME_STEPS = `name: Open PRs Report for Team One Workflow
description: Daily report of team "TeamOne Workflow" PRs from elastic/kibana.

enabled: true
tags:
  - github
  - team-one-workflow

consts:
  github_search_url: "https://api.github.com/search/issues?q=is%3Apr+label%3A%22Team%3AOne+Workflow%22+is%3Aopen+repo%3Aelastic%2Fkibana&per_page=100"
  # slack_webhook_url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

triggers:
  - type: scheduled
    with:
      rule:
        freq: DAILY
        interval: 1
        byhour: [9]
        byminute: [0]
        tzid: UTC

steps:
  - name: fetchPullRequests
    type: http.request
    with:
      url: "{{ consts.github_search_url }}"
      method: GET
      headers:
        Accept: "application/vnd.github.v3+json"
        User-Agent: "ElasticWorkflow/1.0"

  - name: logPrCount
    type: console
    with:
      message: "Found {{ steps.fetchPullRequests.output.total_count }} open PRs"

  - name: iteratePullRequests
    type: foreach
    foreach: steps.fetchPullRequests.output.items
    steps:
      - name: logPullRequest
        type: console
        with:
          message: "#{{ steps.iteratePullRequests.item.number }} - {{ steps.iteratePullRequests.item.title }}"
`;

interface DiffAttachmentStoryProps {
  beforeYaml: string;
  afterYaml: string;
  name: string;
  status: 'pending' | 'accepted' | 'declined';
  containerWidth: number;
}

const DiffAttachmentStory: React.FC<DiffAttachmentStoryProps> = ({
  beforeYaml,
  afterYaml,
  name,
  status,
  containerWidth,
}) => {
  const attachment = {
    id: 'story-attachment',
    type: WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
    data: {
      beforeYaml,
      afterYaml,
      proposalId: 'story-proposal',
      status,
      name,
    },
  };

  const label = workflowYamlDiffAttachmentUiDefinition.getLabel(attachment);

  return (
    <div style={{ width: containerWidth, margin: '24px auto' }}>
      <EuiSplitPanel.Outer grow hasShadow={false} hasBorder>
        <EuiSplitPanel.Inner color="subdued" paddingSize="m">
          <strong>{label}</strong>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner grow={false} paddingSize="none">
          {workflowYamlDiffAttachmentUiDefinition.renderInlineContent!({
            attachment,
            isSidebar: false,
          })}
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </div>
  );
};

const meta: Meta<typeof DiffAttachmentStory> = {
  title: 'Workflows Management/Diff Attachment',
  component: DiffAttachmentStory,
  argTypes: {
    status: {
      control: 'radio',
      options: ['pending', 'accepted', 'declined'],
    },
    containerWidth: {
      control: { type: 'range', min: 300, max: 900, step: 50 },
    },
  },
};

export default meta;

type Story = StoryObj<typeof DiffAttachmentStory>;

export const DeleteLine: Story = {
  args: {
    beforeYaml: BEFORE_YAML,
    afterYaml: AFTER_DELETE_CONST,
    name: 'Open PRs Report for Team One Workflow',
    status: 'pending',
    containerWidth: 700,
  },
};

export const AddStep: Story = {
  args: {
    beforeYaml: BEFORE_YAML,
    afterYaml: AFTER_ADD_STEP,
    name: 'Open PRs Report for Team One Workflow',
    status: 'pending',
    containerWidth: 700,
  },
};

export const RenameSteps: Story = {
  args: {
    beforeYaml: BEFORE_YAML,
    afterYaml: AFTER_RENAME_STEPS,
    name: 'Open PRs Report for Team One Workflow',
    status: 'pending',
    containerWidth: 700,
  },
};

export const Accepted: Story = {
  args: {
    beforeYaml: BEFORE_YAML,
    afterYaml: AFTER_DELETE_CONST,
    name: 'Open PRs Report for Team One Workflow',
    status: 'accepted',
    containerWidth: 700,
  },
};

export const NarrowContainer: Story = {
  args: {
    beforeYaml: BEFORE_YAML,
    afterYaml: AFTER_DELETE_CONST,
    name: 'Open PRs Report for Team One Workflow',
    status: 'pending',
    containerWidth: 400,
  },
};

export const NoChanges: Story = {
  args: {
    beforeYaml: BEFORE_YAML,
    afterYaml: BEFORE_YAML,
    name: 'Open PRs Report for Team One Workflow',
    status: 'pending',
    containerWidth: 700,
  },
};
