/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { tabColor } from '../../../../../common/util/group_color_utils';

import PropTypes from 'prop-types';
import React from 'react';


export function JobGroup({ name }) {
  return (
    <div
      className="inline-group"
      style={{ backgroundColor: tabColor(name) }}
    >
      {name}
    </div>
  );
}
JobGroup.propTypes = {
  name: PropTypes.string.isRequired,
};
