/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { experimentalBadge } from '../../components/experimental_badge';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import { useCreateFromTemplateQuery } from '../../hooks/use_create_from_template_query';
import { RuleLibraryList } from './rule_library_list';
import { V1RuleLibraryList } from './v1_rule_library_list';
import {
  getDefaultRuleLibraryEngine,
  useRuleLibraryAccess,
  type RuleLibraryEngine,
} from './use_rule_library_access';

const RULE_LIBRARY_PAGE_TITLE = i18n.translate('xpack.alertingV2.ruleLibrary.pageTitle', {
  defaultMessage: 'Rule library',
});

const V2_TAB_LABEL = i18n.translate('xpack.alertingV2.ruleLibrary.v2TabTitle', {
  defaultMessage: 'V2',
});

const V1_TAB_LABEL = i18n.translate('xpack.alertingV2.ruleLibrary.v1TabTitle', {
  defaultMessage: 'V1',
});

export const RuleLibraryPage = () => {
  useBreadcrumbs('rule_library_list');
  const { canAccessV1, canAccessV2 } = useRuleLibraryAccess();
  const [selectedEngine, setSelectedEngine] = useState<RuleLibraryEngine>(() =>
    getDefaultRuleLibraryEngine({ canAccessV1, canAccessV2 })
  );
  const showV2Library = selectedEngine === 'v2';
  const shareListUrlState = !(canAccessV1 && canAccessV2);
  const { flyout, openCreateFromTemplateFlyout } = useComposeDiscoverFlyout();
  useCreateFromTemplateQuery(openCreateFromTemplateFlyout, { enabled: showV2Library });

  const tabs = useMemo<AppHeaderTab[]>(() => {
    if (!canAccessV1 || !canAccessV2) {
      return [];
    }

    return [
      {
        id: 'v2Templates',
        label: V2_TAB_LABEL,
        isSelected: showV2Library,
        onClick: () => setSelectedEngine('v2'),
        'data-test-subj': 'ruleLibraryV2Tab',
      },
      {
        id: 'v1Templates',
        label: V1_TAB_LABEL,
        isSelected: !showV2Library,
        onClick: () => setSelectedEngine('v1'),
        'data-test-subj': 'ruleLibraryV1Tab',
      },
    ];
  }, [canAccessV1, canAccessV2, showV2Library]);

  return (
    <div data-test-subj="ruleLibraryPage">
      <AppHeader
        sticky={false}
        title={RULE_LIBRARY_PAGE_TITLE}
        tabs={tabs}
        badges={[experimentalBadge]}
        spacing="bleed"
      />
      <EuiSpacer size="m" />
      {showV2Library ? (
        <RuleLibraryList urlSync={shareListUrlState} />
      ) : (
        <V1RuleLibraryList urlSync={shareListUrlState} />
      )}
      {flyout}
    </div>
  );
};
