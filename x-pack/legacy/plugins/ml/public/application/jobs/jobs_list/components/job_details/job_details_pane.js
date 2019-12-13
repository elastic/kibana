/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React, {
  Component
} from 'react';

import {
  EuiTitle,
  EuiTable,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
  EuiSpacer
} from '@elastic/eui';

function SectionItem({ item }) {
  return (
    <EuiTableRow>
      {item[0] !== '' &&
        <EuiTableRowCell>
          <span className="job-item header">{item[0]}</span>
        </EuiTableRowCell>
      }
      <EuiTableRowCell>
        <span className="job-item">{item[1]}</span>
      </EuiTableRowCell>
    </EuiTableRow>
  );
}
SectionItem.propTypes = {
  item: PropTypes.array.isRequired,
};



function Section({ section }) {
  if (section.items.length === 0) {
    return <div />;
  }

  return (
    <React.Fragment>
      <EuiTitle size="xs"><h4>{section.title}</h4></EuiTitle>
      <div className="job-section"  data-test-subj={`mlJobRowDetailsSection-${section.id}`}>
        <EuiTable compressed={true}>
          <EuiTableBody>
            { section.items.map((item, i) => (<SectionItem item={item} key={i} />)) }
          </EuiTableBody>
        </EuiTable>
      </div>
    </React.Fragment>
  );
}
Section.propTypes = {
  section: PropTypes.object.isRequired,
};


export class JobDetailsPane  extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  static getDerivedStateFromProps(props) {
    const { sections, time } = props;
    return { sections, time };
  }

  render() {
    const { sections, time } = this.state;
    return (
      <React.Fragment>
        <EuiSpacer size="s" />
        <div className="row" time={time}  data-test-subj={this.props['data-test-subj']}>
          <div className="col-md-6">
            {
              sections
                .filter(s => s.position === 'left')
                .map((s, i) => (<Section section={s} key={i} />))
            }
          </div>
          <div className="col-md-6">
            {
              sections
                .filter(s => s.position === 'right')
                .map((s, i) => (<Section section={s} key={i} />))
            }
          </div>
        </div>
      </React.Fragment>
    );
  }
}
JobDetailsPane.propTypes = {
  sections: PropTypes.array.isRequired,
  'data-test-subj': PropTypes.string,
};

