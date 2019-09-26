/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component } from 'react';
import { RouteProps } from 'react-router';
import { BASE_PATH } from '../../../../common/constants';
import { BreadcrumbConsumer } from './consumer';
import { Breadcrumb as BreadcrumbData, BreadcrumbContext } from './types';

interface BreadcrumbManagerProps extends RouteProps {
  text: string;
  href?: string;
  parents?: BreadcrumbData[];
  context: BreadcrumbContext;
}

class BreadcrumbManager extends Component<BreadcrumbManagerProps, {}, BreadcrumbContext> {
  public componentWillUnmount() {
    const { text, href, context } = this.props;

    context.removeCrumb({
      text,
      href,
    });
  }

  public componentDidMount() {
    const { text, href, parents, context } = this.props;
    context.addCrumb(
      {
        text,
        href,
      },
      parents
    );
  }

  public render() {
    return <span />;
  }
}

interface BreadcrumbProps extends RouteProps {
  title: string;
  path?: string;
  parentBreadcrumbs?: BreadcrumbData[];
}

export const Breadcrumb: React.SFC<BreadcrumbProps> = ({ title, path, parentBreadcrumbs }) => (
  <BreadcrumbConsumer>
    {context => (
      <BreadcrumbManager
        text={title}
        href={`#${BASE_PATH}${path}`}
        parents={parentBreadcrumbs}
        context={context}
      />
    )}
  </BreadcrumbConsumer>
);
