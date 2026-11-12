/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiBadge, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isAlertingV2Enabled } from '@kbn/alerting-v2-utils';
import {
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
} from '@kbn/deeplinks-observability';
import type { LocatorHost } from '@kbn/rule-data-utils';

import { useAlertingV2RuleLibraryLocator, useStartServices } from '../../../../../hooks';
import { KibanaAssetType } from '../../../../../types';
import { AssetsAccordion, type DisplayedAssetType } from '../assets/assets_accordion';

import type { AlertingAsset, AlertingEngine } from './types';

const isV2AlertingAsset = (asset: Pick<AlertingAsset, 'attributes'>): boolean =>
  asset.attributes?.engine === 'v2';

const ALERTING_ENGINE_CLASSIC_BADGE = i18n.translate(
  'xpack.fleet.epm.assets.alertingEngineClassicBadgeLabel',
  { defaultMessage: 'Classic' }
);

const ALERTING_ENGINE_V2_BADGE = i18n.translate(
  'xpack.fleet.epm.assets.alertingEngineV2BadgeLabel',
  { defaultMessage: 'Universal' }
);

const ALERTING_ENGINE_CLASSIC_ARIA_LABEL = i18n.translate(
  'xpack.fleet.epm.assets.alertingEngineClassicBadgeAriaLabel',
  { defaultMessage: 'Classic rules' }
);

const ALERTING_ENGINE_V2_ARIA_LABEL = i18n.translate(
  'xpack.fleet.epm.assets.alertingEngineV2BadgeAriaLabel',
  { defaultMessage: 'Universal rules' }
);

const getAlertingEngineBadge = (engine?: AlertingEngine): { label: string; ariaLabel: string } => {
  if (engine === 'v2') {
    return { label: ALERTING_ENGINE_V2_BADGE, ariaLabel: ALERTING_ENGINE_V2_ARIA_LABEL };
  }

  return { label: ALERTING_ENGINE_CLASSIC_BADGE, ariaLabel: ALERTING_ENGINE_CLASSIC_ARIA_LABEL };
};

const OBSERVABILITY_RULE_LIBRARY_HOST: LocatorHost = {
  app: OBSERVABILITY_ALERTING_APP_ID,
  pathPrefix: OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
};

const getAlertingAssetTitleHref = (
  asset: Pick<AlertingAsset, 'id' | 'attributes' | 'appLink'>,
  type: DisplayedAssetType,
  getRuleLibraryUrl: (templateId: string) => string | undefined
): string | undefined => {
  if (type === KibanaAssetType.alertingRuleTemplate && isV2AlertingAsset(asset)) {
    // Alerting v2 rule templates have no management destination; link them to the rule library.
    // v2 templates are only listed where the Observability rule library exists.
    return getRuleLibraryUrl(asset.id);
  }
  return asset.appLink;
};

const listAlertingAssets = (
  savedObjects: AlertingAsset[],
  { hideV2 }: { hideV2: boolean }
): AlertingAsset[] =>
  hideV2 ? savedObjects.filter((asset) => !isV2AlertingAsset(asset)) : savedObjects;

const filterAlertingAssetsByEngine = (
  savedObjects: AlertingAsset[],
  engine: AlertingEngine
): AlertingAsset[] =>
  savedObjects.filter((asset) =>
    engine === 'v2' ? isV2AlertingAsset(asset) : !isV2AlertingAsset(asset)
  );

const AlertingEngineTabs: React.FunctionComponent<{
  selectedEngineTab: AlertingEngine;
  onSelect: (engine: AlertingEngine) => void;
}> = ({ selectedEngineTab, onSelect }) => {
  return (
    <EuiTabs data-test-subj="fleetAlertingEngineTabs">
      <EuiTab
        data-test-subj="fleetAlertingEngineTab-v2"
        onClick={() => onSelect('v2')}
        isSelected={selectedEngineTab === 'v2'}
      >
        <FormattedMessage
          id="xpack.fleet.epm.assets.kibanaEsqlRulesTabLabel"
          defaultMessage="Universal rules"
        />
      </EuiTab>
      <EuiTab
        data-test-subj="fleetAlertingEngineTab-v1"
        onClick={() => onSelect('v1')}
        isSelected={selectedEngineTab === 'v1'}
      >
        <FormattedMessage
          id="xpack.fleet.epm.assets.kibanaStandardRulesTabLabel"
          defaultMessage="Classic rules"
        />
      </EuiTab>
    </EuiTabs>
  );
};

const AlertingEngineBadge: React.FunctionComponent<{
  engine?: AlertingEngine;
}> = ({ engine }) => {
  const engineBadge = getAlertingEngineBadge(engine);

  return (
    <EuiBadge
      color="hollow"
      aria-label={engineBadge.ariaLabel}
      data-test-subj={`fleetAssetsAccordion.engineBadge.${engine ?? 'v1'}`}
    >
      {engineBadge.label}
    </EuiBadge>
  );
};

const useAlertingEngineAssets = (savedObjects: AlertingAsset[], type: DisplayedAssetType) => {
  const startServices = useStartServices();
  const projectType = startServices.cloud?.serverless?.projectType;
  const isAlertingRuleTemplate = type === KibanaAssetType.alertingRuleTemplate;
  const hasV2Templates = savedObjects.some(isV2AlertingAsset);
  // Universal rules are only offered on Observability projects among serverless project types.
  const isUniversalRulesAvailable =
    isAlertingV2Enabled(startServices) && (!projectType || projectType === 'observability');
  const showEngineUi = isAlertingRuleTemplate && hasV2Templates && isUniversalRulesAvailable;
  const [selectedEngineTab, setSelectedEngineTab] = useState<AlertingEngine>(
    hasV2Templates ? 'v2' : 'v1'
  );

  const listedSavedObjects = listAlertingAssets(savedObjects, {
    hideV2: isAlertingRuleTemplate && !isUniversalRulesAvailable,
  });
  const visibleSavedObjects = showEngineUi
    ? filterAlertingAssetsByEngine(listedSavedObjects, selectedEngineTab)
    : listedSavedObjects;

  return {
    listedSavedObjects,
    visibleSavedObjects,
    showEngineUi,
    selectedEngineTab,
    setSelectedEngineTab,
  };
};

export const AlertingAssetsAccordion: React.FunctionComponent<{
  type: DisplayedAssetType;
  savedObjects: AlertingAsset[];
}> = ({ savedObjects, type }) => {
  const ruleLibraryLocator = useAlertingV2RuleLibraryLocator();
  const getRuleLibraryUrl = (templateId: string) =>
    ruleLibraryLocator?.getRedirectUrl({ templateId, host: OBSERVABILITY_RULE_LIBRARY_HOST });
  const {
    listedSavedObjects,
    visibleSavedObjects,
    showEngineUi,
    selectedEngineTab,
    setSelectedEngineTab,
  } = useAlertingEngineAssets(savedObjects, type);

  return (
    <AssetsAccordion
      type={type}
      savedObjects={visibleSavedObjects}
      itemCount={listedSavedObjects.length}
      initialIsOpen={showEngineUi}
      header={
        showEngineUi ? (
          <>
            <AlertingEngineTabs
              selectedEngineTab={selectedEngineTab}
              onSelect={setSelectedEngineTab}
            />
            <EuiSpacer size="m" />
          </>
        ) : undefined
      }
      titleExtra={
        showEngineUi
          ? (asset) => <AlertingEngineBadge engine={asset.attributes?.engine} />
          : undefined
      }
      getTitleHref={(asset) => getAlertingAssetTitleHref(asset, type, getRuleLibraryUrl)}
    />
  );
};
