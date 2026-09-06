/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ViewSpec } from '@kbn/adaptive-ui';
import {
  Actions,
  Badge,
  BadgeGroup,
  DescriptionList,
  DescriptionListItem,
  Stat,
  StatGroup,
  Text,
  View,
  toViewSpec,
} from '@kbn/adaptive-ui/jsx';
import { severityTone, titleCase } from './shared';

/**
 * Mirror of `CaseAttachmentData` from the Cases plugin
 * (`x-pack/platform/plugins/shared/cases/common/types/agent_builder/attachment_schemas.ts`).
 * Kept local so this package needs no dependency on `@kbn/cases-plugin`.
 */
export interface CaseData {
  id: string;
  incremental_id?: number;
  title: string;
  description?: string;
  status: string;
  severity: string;
  totalAlerts?: number;
  totalComment?: number;
  total_observables?: number;
  tags?: string[];
  owner?: string;
  assignees?: Array<{ uid: string }> | null;
  category?: string | null;
  connector_name?: string;
  created_at?: string;
  updated_at?: string;
  url?: string;
}

const caseHref = ({ url, id }: CaseData): string => url ?? `/app/security/cases/${id}`;

const caseReference = ({ incremental_id: incrementalId }: CaseData): string | undefined =>
  incrementalId != null ? `#${incrementalId}` : undefined;

/**
 * Alternate rendering for the `case` attachment ([case_attachment_definition.tsx](../../../../plugins/shared/cases/public/agent_builder/attachments/case_attachment_definition.tsx)):
 * a single case as severity/status badges, an alert/comment/observable stat row,
 * the description, a metadata field list, and a "Go to case" action.
 */
export const toCaseViewSpec = (data: CaseData): ViewSpec => {
  const reference = caseReference(data);
  const hasDetails = Boolean(
    data.assignees?.length ||
      data.category ||
      data.connector_name ||
      data.tags?.length ||
      data.updated_at
  );

  return toViewSpec(
    <View
      title={reference ? `${reference} ${data.title}` : data.title}
      subtitle={`${titleCase(data.severity)} severity · ${titleCase(data.status)}`}
    >
      <BadgeGroup>
        <Badge label={titleCase(data.status)} tone="primary" variant="hollow" />
        <Badge label={titleCase(data.severity)} tone={severityTone(data.severity)} variant="fill" />
      </BadgeGroup>
      <StatGroup>
        <Stat label="Alerts" value={String(data.totalAlerts ?? 0)} />
        <Stat label="Comments" value={String(data.totalComment ?? 0)} />
        <Stat label="Observables" value={String(data.total_observables ?? 0)} />
      </StatGroup>
      {data.description && <Text body={data.description} />}
      {hasDetails && (
        <DescriptionList label="Details" layout="inline">
          {data.assignees?.length ? (
            <DescriptionListItem title="Assignees" description={String(data.assignees.length)} />
          ) : null}
          {data.category && <DescriptionListItem title="Category" description={data.category} />}
          {data.connector_name && (
            <DescriptionListItem title="Connector" description={data.connector_name} />
          )}
          {data.tags && data.tags.length > 0 && (
            <DescriptionListItem title="Tags" description={data.tags.join(', ')} />
          )}
          {data.updated_at && <DescriptionListItem title="Updated" description={data.updated_at} />}
        </DescriptionList>
      )}
      <Actions items={[{ label: 'Go to case', href: caseHref(data), tone: 'primary' }]} />
    </View>
  );
};

export const sampleCase: CaseData = {
  id: '101',
  incremental_id: 101,
  title: 'Suspicious PowerShell on finance hosts',
  description:
    'Encoded command lines observed on four hosts in the finance subnet. Two have since been isolated.',
  status: 'in-progress',
  severity: 'high',
  totalAlerts: 24,
  totalComment: 8,
  total_observables: 5,
  tags: ['windows', 'execution'],
  owner: 'securitySolution',
  assignees: [{ uid: 'drew' }, { uid: 'sam' }],
  category: 'Endpoint',
  connector_name: 'Elastic Cloud',
  updated_at: '2026-08-19T15:04:00.000Z',
  url: '/app/security/cases/101',
};
