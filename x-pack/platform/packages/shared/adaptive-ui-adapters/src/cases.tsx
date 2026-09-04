/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ViewSpec } from '@kbn/adaptive-ui';
import { Entity, EntityList, View, toViewSpec } from '@kbn/adaptive-ui/jsx';
import { severityTone, titleCase } from './shared';
import { type CaseData, sampleCase } from './case';

/**
 * Mirror of `CasesAttachmentData` from the Cases plugin
 * (`x-pack/platform/plugins/shared/cases/common/types/agent_builder/attachment_schemas.ts`).
 */
export interface CasesData {
  cases: CaseData[];
  total: number;
  url?: string;
}

/**
 * Alternate rendering for the `cases` attachment ([cases_attachment_definition.tsx](../../../../plugins/shared/cases/public/agent_builder/attachments/cases_attachment_definition.tsx)):
 * a collection as an `entityList`, each row a `#nnn` reference, external title, a
 * pill row of alert/comment counts, and a trailing severity status.
 */
export const toCasesViewSpec = ({ cases, total }: CasesData): ViewSpec =>
  toViewSpec(
    <View title="Cases" subtitle={`${total} ${total === 1 ? 'case' : 'cases'}`}>
      <EntityList label="Cases">
        {cases.map((item) => (
          <Entity
            key={item.id}
            identifier={item.incremental_id != null ? `#${item.incremental_id}` : undefined}
            title={item.title}
            external
            body={item.description}
            pills={[
              {
                type: 'badge',
                label: 'Alerts',
                count: item.totalAlerts ?? 0,
                tone: 'warning',
              },
              { type: 'badge', label: 'Comments', count: item.totalComment ?? 0 },
            ]}
            status={{ label: titleCase(item.severity), tone: severityTone(item.severity) }}
            action={{ label: 'Open case', href: item.url ?? `/app/security/cases/${item.id}` }}
          />
        ))}
      </EntityList>
    </View>
  );

export const sampleCases: CasesData = {
  total: 3,
  url: '/app/security/cases',
  cases: [
    sampleCase,
    {
      id: '98',
      incremental_id: 98,
      title: 'Failed logins from unfamiliar ASN',
      description: 'Rate-limited at the edge; no successful authentication.',
      status: 'open',
      severity: 'low',
      totalAlerts: 3,
      totalComment: 1,
    },
    {
      id: '95',
      incremental_id: 95,
      title: 'Data exfiltration signature on egress gateway',
      description: 'Matched two DLP rules; awaiting analyst triage.',
      status: 'open',
      severity: 'medium',
      totalAlerts: 11,
      totalComment: 0,
    },
  ],
};
