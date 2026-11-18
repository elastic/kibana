/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { AlertEpisodeDetailsServices } from '@kbn/alerting-v2-episodes-ui/components/details/types';
import { AlertEpisodeOverviewTab } from '@kbn/alerting-v2-episodes-ui/components/details/overview_tab';
import { AlertEpisodeRunbookFlyout } from '@kbn/alerting-v2-episodes-ui/components/details/runbook_flyout';
import { useEpisodeDetailsHeaderData } from '@kbn/alerting-v2-episodes-ui/hooks/use_episode_details_header_data';
import { isRuleLoaded } from '@kbn/alerting-v2-episodes-ui/types/rule_state';

export interface EpisodeOverviewDocViewProps {
  episodeId: string;
  groupHash: string | undefined;
  services: Pick<
    AlertEpisodeDetailsServices,
    'data' | 'http' | 'expressions' | 'spaces' | 'dataViews'
  >;
  getRuleDetailsHref: (ruleId: string) => string;
  getEpisodeDetailsHref: (episodeId: string) => string;
}

/** The alerts page overview tab, for the Discover document viewer. */
export const EpisodeOverviewDocView = ({
  episodeId,
  groupHash,
  services,
  getRuleDetailsHref,
  getEpisodeDetailsHref,
}: EpisodeOverviewDocViewProps) => {
  const [isRunbookOpen, setIsRunbookOpen] = useState(false);
  // Shares its requests with the header, which loads the same data.
  const { episode, ruleState } = useEpisodeDetailsHeaderData({ episodeId, groupHash, services });
  const ruleName = isRuleLoaded(ruleState) ? ruleState.rule.metadata.name : undefined;

  return (
    <>
      <EuiSpacer size="m" />
      <AlertEpisodeOverviewTab
        episodeId={episodeId}
        episode={episode}
        ruleState={ruleState}
        services={services}
        getRuleDetailsHref={getRuleDetailsHref}
        getEpisodeDetailsHref={getEpisodeDetailsHref}
        onShowFullGuide={() => setIsRunbookOpen(true)}
      />
      {/* Joins the document viewer history, so the user can go back to the document. */}
      {isRunbookOpen && (
        <AlertEpisodeRunbookFlyout
          episodeId={episodeId}
          ruleName={ruleName}
          services={services}
          historyKey={DOC_VIEWER_FLYOUT_HISTORY_KEY}
          onClose={() => setIsRunbookOpen(false)}
        />
      )}
    </>
  );
};
