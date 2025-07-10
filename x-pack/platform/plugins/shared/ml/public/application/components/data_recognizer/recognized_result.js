/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { EuiIcon, EuiFlexItem } from '@elastic/eui';
import { LinkCard } from '../link_card';
import { useMlManagementLocator } from '../../contexts/kibana';
import { ML_PAGES } from '../../../../common/constants/locator';

export const RecognizedResult = ({ config, indexPattern, savedSearch }) => {
  const id = savedSearch === null ? `index=${indexPattern.id}` : `savedSearchId=${savedSearch.id}`;

  const mlManagementLocator = useMlManagementLocator();

  const navigateToCreateJobRecognizerPath = async () => {
    if (!mlManagementLocator) return;

    await mlManagementLocator.navigate({
      sectionId: 'ml',
      appId: `anomaly_detection/${ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_RECOGNIZER}?id=${config.id}&${id}`,
    });
  };

  let logo = null;
  // if a logo is available, use that, otherwise display the id
  // the logo should be a base64 encoded image or an eui icon
  if (config.logo && config.logo.icon) {
    logo = <EuiIcon type={config.logo.icon} size="xl" />;
  } else if (config.logo && config.logo.src) {
    logo = <img alt="" src={config.logo.src} />;
  } else {
    logo = <h3 className="euiTitle euiTitle--small">{config.id}</h3>;
  }

  return (
    <EuiFlexItem>
      <LinkCard
        data-test-subj={`mlRecognizerCard ${config.id}`}
        onClick={navigateToCreateJobRecognizerPath}
        title={config.title}
        description={config.description}
        icon={logo}
      />
    </EuiFlexItem>
  );
};

RecognizedResult.propTypes = {
  config: PropTypes.object,
  indexPattern: PropTypes.object,
  savedSearch: PropTypes.object,
};
