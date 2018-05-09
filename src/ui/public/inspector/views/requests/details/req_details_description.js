import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiText,
} from '@elastic/eui';

function RequestDetailsDescription(props) {
  return (
    <EuiText className="requests-details__description">
      { props.request.description }
    </EuiText>
  );
}

RequestDetailsDescription.shouldShow = (request) => !!request.description;

RequestDetailsDescription.propTypes = {
  request: PropTypes.object.isRequired,
};

export { RequestDetailsDescription };
