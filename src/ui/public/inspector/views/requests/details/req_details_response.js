import React from 'react';
import {
  EuiCodeBlock,
} from '@elastic/eui';

function RequestDetailsResponse(props) {
  return (
    <EuiCodeBlock
      language="json"
      paddingSize="s"
    >
      { JSON.stringify(props.request.response.json, null, 2) }
    </EuiCodeBlock>
  );
}

RequestDetailsResponse.shouldShow = (request) => request.response && request.response.json;

export { RequestDetailsResponse };
