/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiIcon,
} from '@elastic/eui';

export const RecognizedResult = ({
  config,
  indexPattern,
  savedSearch
}) => {
  const id = (savedSearch === undefined || savedSearch.id === undefined) ?
    `index=${indexPattern.id}` :
    `savedSearchId=${savedSearch.id}`;

  const href = `#/jobs/new_job/recognize?id=${config.id}&${id}`;

  let logo = null;
  // if a logo is available, use that, otherwise display the id
  // the logo should be a base64 encoded image or an eui icon
  if(config.logo && config.logo.icon) {
    logo = <div className="synopsisIcon"><EuiIcon type={config.logo.icon} size="xl" /></div>;
  } else if (config.logo && config.logo.src) {
    logo = <div><img className="synopsisIcon" alt="" src={config.logo.src}/></div>;
  } else {
    logo = <h3 className="euiTitle euiTitle--small">{config.id}</h3>;
  }

  return (
    <div className="euiFlexItem">
      <a href={href} className="euiLink synopsis">
        <div className="euiPanel euiPanel--paddingMedium synopsisPanel">
          <div className="euiFlexGroup euiFlexGroup--gutterLarge euiFlexGroup--responsive">
            <div className="euiFlexItem euiFlexItem--flexGrowZero ml-data-recognizer-logo">
              {logo}
            </div>
            <div className="euiFlexItem synopsisContent">
              <h4 className="euiTitle euiTitle--small synopsisTitle">{config.title}</h4>
              <div className="euiText synopsisBody">
                <p>
                  <span className="euiTextColor euiTextColor--subdued">
                    {config.description}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
};

RecognizedResult.propTypes = {
  config: PropTypes.object,
  indexPattern: PropTypes.object,
  savedSearch: PropTypes.object,
};
