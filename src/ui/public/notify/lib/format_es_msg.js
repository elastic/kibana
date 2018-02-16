import _ from 'lodash';

const getRootCause = err => _.get(err, 'resp.error.root_cause');

/**
 * Utilize the extended error information returned from elasticsearch
 * @param  {Error|String} err
 * @returns {string}
 */
export const formatESMsg = (err) => {
  const rootCause = getRootCause(err);

  if (!rootCause) {
    return;
  }

  const result = _.pluck(rootCause, 'reason').join('\n');
  return result;
};

export const getPainlessError = (err) => {
  const rootCause = getRootCause(err);

  if (!rootCause) {
    return;
  }

  const { lang, script } = rootCause[0];

  if (lang !== 'painless') {
    return;
  }

  return {
    lang,
    script,
    message: `Error with Painless scripted field '${script}'`,
    error: err.message,
  };
};
