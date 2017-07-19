import { green, magenta } from 'ansicolors';

export function initVerboseRemoteLogging(log, server) {
  const wrap = (original, httpMethod) => (path, requestData, pathParts) => {
    const url = '/' + path.split('/').slice(2).join('/').replace(/\$(\d)/, function (_, index) {
      return encodeURIComponent(pathParts[index]);
    });

    if (requestData == null) {
      log.verbose('[remote] >  %s %s', httpMethod, url);
    } else {
      log.verbose('[remote] >  %s %s %j', httpMethod, url, requestData);
    }

    return original.call(server, path, requestData, pathParts)
    .then(result => {
      log.verbose(`[remote]  < %s %s ${green('OK')}`, httpMethod, url);
      return result;
    })
    .catch(error => {
      let message;
      try {
        message = JSON.parse(error.response.data).value.message;
      } catch (err) {
        message = err.message;
      }

      log.verbose(`[remote]  < %s %s ${magenta('ERR')} %j`, httpMethod, url, message.split(/\r?\n/)[0]);
      throw error;
    });
  };

  server._get = wrap(server._get, 'GET');
  server._post = wrap(server._post, 'POST');
  server._delete = wrap(server._delete, 'DELETE');
  return server;
}
