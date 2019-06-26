/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { Route as ReactRoute, RouteProps } from 'react-router-dom';
import { Match, routeChange } from '../actions';
import { decodeRevisionString } from '../utils/url';

interface Props extends RouteProps {
  routeChange: (match: Match) => void;
}
class CSRoute extends ReactRoute<Props> {
  // eslint-disable-next-line @typescript-eslint/camelcase
  public UNSAFE_componentWillMount() {
    if (this.state.match && this.state.match.params && this.state.match.params.revision) {
      this.state.match.params.revision = decodeRevisionString(this.state.match.params.revision);
    }
    this.props.routeChange({ ...this.state.match, location: this.props.location });
  }

  public componentDidUpdate() {
    if (this.state.match && this.state.match.params && this.state.match.params.revision) {
      this.state.match.params.revision = decodeRevisionString(this.state.match.params.revision);
    }
    this.props.routeChange({ ...this.state.match, location: this.props.location });
  }
}

export const Route = connect(
  null,
  { routeChange }
)(CSRoute);
