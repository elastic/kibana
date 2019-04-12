/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import isEqual from 'lodash/fp/isEqual';
import React from 'react';

import { Breadcrumb } from 'ui/chrome/api/breadcrumbs';

interface ExternalHeaderProps {
  breadcrumbs?: Breadcrumb[];
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
}

export class ExternalHeader extends React.Component<ExternalHeaderProps> {
  public componentDidMount() {
    this.setBreadcrumbs();
  }

  public componentDidUpdate(prevProps: ExternalHeaderProps) {
    if (!isEqual(this.props.breadcrumbs, prevProps.breadcrumbs)) {
      this.setBreadcrumbs();
    }
  }

  public render() {
    return null;
  }

  private setBreadcrumbs = () => {
    this.props.setBreadcrumbs(this.props.breadcrumbs || []);
  };
}
