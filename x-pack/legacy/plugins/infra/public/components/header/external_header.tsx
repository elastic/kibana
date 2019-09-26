/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import isEqual from 'lodash/fp/isEqual';
import React from 'react';

import { Badge } from 'ui/chrome/api/badge';
import { Breadcrumb } from 'ui/chrome/api/breadcrumbs';

interface ExternalHeaderProps {
  breadcrumbs?: Breadcrumb[];
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
  badge: Badge | undefined;
  setBadge: (badge: Badge | undefined) => void;
}

export class ExternalHeader extends React.Component<ExternalHeaderProps> {
  public componentDidMount() {
    this.setBreadcrumbs();
    this.setBadge();
  }

  public componentDidUpdate(prevProps: ExternalHeaderProps) {
    if (!isEqual(this.props.breadcrumbs, prevProps.breadcrumbs)) {
      this.setBreadcrumbs();
    }

    if (!isEqual(this.props.badge, prevProps.badge)) {
      this.setBadge();
    }
  }

  public render() {
    return null;
  }

  private setBadge = () => {
    this.props.setBadge(this.props.badge);
  };

  private setBreadcrumbs = () => {
    this.props.setBreadcrumbs(this.props.breadcrumbs || []);
  };
}
