import React from 'react';
import {
  EuiCodeBlock,
} from '@elastic/eui';

function RequestDetailsRequest(props) {
  return (
    <EuiCodeBlock
      language="json"
      paddingSize="s"
    >
      { JSON.stringify(props.request.json, null, 2) }
    </EuiCodeBlock>
  );
}

RequestDetailsRequest.shouldShow = (request) => !!request.json;

export { RequestDetailsRequest };
