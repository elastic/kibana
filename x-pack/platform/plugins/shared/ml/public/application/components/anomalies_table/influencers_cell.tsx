/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';

import { EuiLink, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useEntityCellStyles } from '../entity_cell/entity_cell_styles';
import { blurButtonOnClick } from '../../util/component_utils';

type InfluencerCellFilter = (
  influencerFieldName: string,
  influencerFieldValue: string,
  direction: '+' | '-'
) => void;

interface Influencer {
  influencerFieldName: string;
  influencerFieldValue: string;
}

interface InfluencerCellProps {
  influencerFilter: InfluencerCellFilter | undefined;
  influencers: Influencer[] | undefined;
  limit: number;
}

/*
 * Component for rendering a list of record influencers inside a cell in the anomalies table.
 * Truncates long lists of influencers to the supplied limit, with the full list of influencers
 * expanded or collapsed via 'and x more' / 'show less' links.
 */
export const InfluencersCell: FC<InfluencerCellProps> = ({
  influencers = [],
  influencerFilter,
  limit,
}) => {
  const { filterButton } = useEntityCellStyles();

  const [showAllInfluencers, setShowAllInfluencers] = useState(false);
  const toggleAllInfluencers = () => setShowAllInfluencers((prev) => !prev);

  let numberToDisplay = showAllInfluencers === false ? limit : influencers.length;
  let othersCount = 0;
  if (influencers !== undefined) {
    othersCount = Math.max(influencers.length - numberToDisplay, 0);
  }
  if (othersCount === 1) {
    // Display the additional influencer.
    numberToDisplay++;
    othersCount = 0;
  }

  const displayInfluencers = influencers
    .reduce<Influencer[]>((acc, influencer) => {
      const [influencerFieldName, influencerFieldValue] = Object.entries(influencer)[0] ?? [];
      if (typeof influencerFieldName === 'string' && typeof influencerFieldValue === 'string') {
        acc.push({
          influencerFieldName,
          influencerFieldValue,
        });
      }
      return acc;
    }, [])
    .slice(0, numberToDisplay);

  return (
    <div>
      {displayInfluencers.map((influencer, index) => (
        <div key={index}>
          {influencer.influencerFieldName}: {influencer.influencerFieldValue}
          {influencerFilter !== undefined && (
            <>
              <EuiToolTip
                content={
                  <FormattedMessage
                    id="xpack.ml.anomaliesTable.influencersCell.addFilterTooltip"
                    defaultMessage="Add filter"
                  />
                }
              >
                <EuiButtonIcon
                  size="s"
                  css={filterButton}
                  onClick={blurButtonOnClick(() => {
                    influencerFilter(
                      influencer.influencerFieldName,
                      influencer.influencerFieldValue,
                      '+'
                    );
                  })}
                  iconType="plusInCircle"
                  aria-label={i18n.translate(
                    'xpack.ml.anomaliesTable.influencersCell.addFilterAriaLabel',
                    {
                      defaultMessage: 'Add filter',
                    }
                  )}
                />
              </EuiToolTip>
              <EuiToolTip
                content={
                  <FormattedMessage
                    id="xpack.ml.anomaliesTable.influencersCell.removeFilterTooltip"
                    defaultMessage="Remove filter"
                  />
                }
              >
                <EuiButtonIcon
                  size="s"
                  css={filterButton}
                  onClick={blurButtonOnClick(() => {
                    influencerFilter(
                      influencer.influencerFieldName,
                      influencer.influencerFieldValue,
                      '-'
                    );
                  })}
                  iconType="minusInCircle"
                  aria-label={i18n.translate(
                    'xpack.ml.anomaliesTable.influencersCell.removeFilterAriaLabel',
                    {
                      defaultMessage: 'Remove filter',
                    }
                  )}
                />
              </EuiToolTip>
            </>
          )}
        </div>
      ))}
      {othersCount > 0 && (
        <EuiLink onClick={() => toggleAllInfluencers()}>
          <FormattedMessage
            id="xpack.ml.anomaliesTable.anomalyDetails.anomalyDescriptionListMoreLinkText"
            defaultMessage="and {othersCount} more"
            values={{ othersCount }}
          />
        </EuiLink>
      )}
      {numberToDisplay > limit + 1 && (
        <EuiLink onClick={() => toggleAllInfluencers()}>
          <FormattedMessage
            id="xpack.ml.anomaliesTable.anomalyDetails.anomalyDescriptionShowLessLinkText"
            defaultMessage="Show less"
          />
        </EuiLink>
      )}
    </div>
  );
};
