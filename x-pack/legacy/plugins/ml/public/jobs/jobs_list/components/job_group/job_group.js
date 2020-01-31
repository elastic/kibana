/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { tabColor } from '../../../../../common/util/group_color_utils';

import PropTypes from 'prop-types';
import React from 'react';
import theme from '@elastic/eui/dist/eui_theme_light.json';

export function JobGroup({ name }) {
  return (
    <div
      className="inline-group"
      data-test-subj="mlJobGroup"
      style={{
        backgroundColor: tabColor(name),
        display: 'inline-block',
        padding: '2px 5px',
        borderRadius: '2px',
        fontSize: '12px',
        margin: '0px 3px',
        color: theme.euiColorEmptyShade,
      }}
    >
      {name}
    </div>
  );
}
JobGroup.propTypes = {
  name: PropTypes.string.isRequired,
};
