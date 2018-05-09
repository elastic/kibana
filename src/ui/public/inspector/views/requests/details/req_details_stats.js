import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiIconTip,
  EuiTable,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
} from '@elastic/eui';

class RequestDetailsStats extends Component {

  static shouldShow = (request) => !!request.stats && Object.keys(request.stats).length;

  state = { };

  renderStatRow = (stat) => {
    return [
      <EuiTableRow
        key={stat.name}
      >
        <EuiTableRowCell>
          {stat.name}
        </EuiTableRowCell>
        <EuiTableRowCell>{stat.value}</EuiTableRowCell>
        <EuiTableRowCell>
          { stat.description &&
            <EuiIconTip
              aria-label="Description"
              type="questionInCircle"
              color="text"
              content={stat.description}
            />
          }
        </EuiTableRowCell>
      </EuiTableRow>
    ];
  };

  render() {
    const { stats } = this.props.request;
    const sortedStats = Object.keys(stats).sort().map(name => ({ name, ...stats[name] }));
    // TODO: Replace by property once available
    return (
      <EuiTable style={{ tableLayout: 'auto' }}>
        <EuiTableBody>
          { sortedStats.map(this.renderStatRow) }
        </EuiTableBody>
      </EuiTable>
    );
  }
}

RequestDetailsStats.propTypes = {
  request: PropTypes.object.isRequired,
};

export { RequestDetailsStats };
