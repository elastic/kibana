/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderBadge } from '@kbn/app-header';
import type { ReactElement } from 'react';
import React from 'react';
import { KI_STATUS_BADGE_COLOR, resolveKiStatus } from '../../../../../../common/ki_expiry';
import type { KiDocument } from '../../../../../../common/http_api/knowledge_indicators';
import type { KiLifecycleStatus } from '../../../../../../common/step_types/ki';
import { formatKiTypeLabel } from '../../../../utils/ki_display';
import { KiLifecycleStatusBadge } from '../../shared/ki_lifecycle_status_badge';
import { KiTypeDisplay } from '../../shared/ki_type_display';

const customAppHeaderBadge = ({
  label,
  color,
  dataTestSubj,
  renderBadge,
}: {
  label: string;
  color: AppHeaderBadge['color'];
  dataTestSubj: string;
  renderBadge: (dataTestSubj: string) => ReactElement;
}): AppHeaderBadge => ({
  label,
  color,
  'data-test-subj': dataTestSubj,
  renderCustomBadge: () => renderBadge(dataTestSubj),
});

const readKiDocumentType = (document: KiDocument): string | undefined => {
  const typeValue = document.type;
  return typeof typeValue === 'string' && typeValue.length > 0 ? typeValue : undefined;
};

export const getViewKiHeaderBadges = (
  document: KiDocument,
  lifecycleStatus?: KiLifecycleStatus
): AppHeaderBadge[] | undefined => {
  const type = readKiDocumentType(document);
  const kiStatus = resolveKiStatus(lifecycleStatus, document.expires_at);

  const badges: AppHeaderBadge[] = [
    ...(type
      ? [
          customAppHeaderBadge({
            label: formatKiTypeLabel(type),
            color: 'hollow',
            dataTestSubj: 'contextViewKiTypeBadge',
            renderBadge: (dataTestSubj) => (
              <KiTypeDisplay as="badge" type={type} data-test-subj={dataTestSubj} />
            ),
          }),
        ]
      : []),
    ...(kiStatus === 'deleted' || kiStatus === 'expired'
      ? [
          customAppHeaderBadge({
            label: kiStatus,
            color: KI_STATUS_BADGE_COLOR[kiStatus],
            dataTestSubj: 'contextViewKiStatusBadge',
            renderBadge: (dataTestSubj) => (
              <KiLifecycleStatusBadge
                lifecycleStatus={lifecycleStatus}
                expiresAt={document.expires_at}
                data-test-subj={dataTestSubj}
              />
            ),
          }),
        ]
      : []),
  ];

  return badges.length > 0 ? badges : undefined;
};
