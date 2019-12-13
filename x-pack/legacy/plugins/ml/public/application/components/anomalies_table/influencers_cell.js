/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiLink,
  EuiButtonIcon,
  EuiToolTip
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';


/*
 * Component for rendering a list of record influencers inside a cell in the anomalies table.
 * Truncates long lists of influencers to the supplied limit, with the full list of influencers
 * expanded or collapsed via 'and x more' / 'show less' links.
 */
export class InfluencersCell extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showAll: false
    };
  }

  toggleAllInfluencers() {
    this.setState({ showAll: !this.state.showAll });
  }

  renderInfluencers(influencers) {
    const numberToDisplay = (this.state.showAll === false) ? this.props.limit : influencers.length;
    const displayInfluencers = influencers.slice(0, numberToDisplay);
    const { influencerFilter } = this.props;

    let othersCount = Math.max(influencers.length - numberToDisplay, 0);
    if (othersCount === 1) {
      // Display the additional influencer.
      displayInfluencers.push(influencers[this.props.limit]);
      othersCount = 0;
    }

    const displayRows = displayInfluencers.map((influencer, index) => (
      <div key={index}>
        {influencer.influencerFieldName}: {influencer.influencerFieldValue}
        {influencerFilter !== undefined &&
          <React.Fragment>
            <EuiToolTip
              content={<FormattedMessage
                id="xpack.ml.anomaliesTable.influencersCell.addFilterTooltip"
                defaultMessage="Add filter"
              />}
            >
              <EuiButtonIcon
                size="xs"
                className="filter-button"
                onClick={() => influencerFilter(influencer.influencerFieldName, influencer.influencerFieldValue, '+')}
                iconType="plusInCircle"
                aria-label={i18n.translate('xpack.ml.anomaliesTable.influencersCell.addFilterAriaLabel', {
                  defaultMessage: 'Add filter'
                })}
              />
            </EuiToolTip>
            <EuiToolTip
              content={<FormattedMessage
                id="xpack.ml.anomaliesTable.influencersCell.removeFilterTooltip"
                defaultMessage="Remove filter"
              />}
            >
              <EuiButtonIcon
                size="xs"
                className="filter-button"
                onClick={() => influencerFilter(influencer.influencerFieldName, influencer.influencerFieldValue, '-')}
                iconType="minusInCircle"
                aria-label={i18n.translate('xpack.ml.anomaliesTable.influencersCell.removeFilterAriaLabel', {
                  defaultMessage: 'Remove filter'
                })}
              />
            </EuiToolTip>
          </React.Fragment>
        }
      </div>
    ));


    return (
      <React.Fragment>
        {displayRows}
        {this.renderOthers(influencers.length, othersCount)}
      </React.Fragment>
    );
  }

  renderOthers(totalCount, othersCount) {
    if (othersCount > 0) {
      return (
        <div>
          <EuiLink
            onClick={() => this.toggleAllInfluencers()}
          >
            <FormattedMessage
              id="xpack.ml.anomaliesTable.influencersCell.moreInfluencersLinkText"
              defaultMessage="and {othersCount} more"
              values={{
                othersCount,
              }}
            />
          </EuiLink>
        </div>
      );
    } else if (totalCount > this.props.limit + 1) {
      return (
        <div>
          <EuiLink
            onClick={() => this.toggleAllInfluencers()}
          >
            <FormattedMessage
              id="xpack.ml.anomaliesTable.influencersCell.showLessInfluencersLinkText"
              defaultMessage="show less"
            />
          </EuiLink>
        </div>
      );
    }
  }

  render() {
    const recordInfluencers = this.props.influencers || [];

    const influencers = [];
    recordInfluencers.forEach((influencer) => {
      _.each(influencer, (influencerFieldValue, influencerFieldName) => {
        influencers.push({
          influencerFieldName,
          influencerFieldValue
        });
      });
    });

    return (
      <div>
        {this.renderInfluencers(influencers)}
        {this.renderOthers(influencers)}
      </div>
    );
  }
}

InfluencersCell.propTypes = {
  influencerFilter: PropTypes.func,
  influencers: PropTypes.array,
  limit: PropTypes.number
};
