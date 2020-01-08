/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Errors mocks to throw during development to help visualizing
 * the different flows in the UI
 *
 * TODO: Consult the ES team and make sure the error shapes are correct
 * for each statusCode.
 */

const error400 = new Error('Something went wrong');
error400.statusCode = 400;
error400.response = `
  {
    "error": {
        "root_cause": [
            {
                "type": "x_content_parse_exception",
                "reason": "[2:3] [put_auto_follow_pattern_request] unknown field [remote_clusterxxxxx], parser not found"
            }
        ],
        "type": "x_content_parse_exception",
        "reason": "[2:3] [put_auto_follow_pattern_request] unknown field [remote_clusterxxxxx], parser not found"
    },
    "status": 400
}`;

const error403 = new Error('Unauthorized');
error403.statusCode = 403;
error403.response = `
  {
    "acknowledged": true,
    "trial_was_started": false,
    "error_message": "Operation failed: Trial was already activated."
  }
`;

export const esErrors = {
  400: error400,
  403: error403,
};
