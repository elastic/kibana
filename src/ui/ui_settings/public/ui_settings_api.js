import { sendRequest } from './send_request';

export function createUiSettingsApi() {
  let unsavedChanges = {};
  let pendingCallbacks = [];
  let timeout = null;

  async function send() {
    const changes = unsavedChanges;
    const callbacks = pendingCallbacks;

    pendingCallbacks = [];
    unsavedChanges = {};

    try {
      const resp = await sendRequest({
        method: 'POST',
        path: '/api/kibana/settings',
        body: { changes },
      });

      callbacks.forEach(cb => cb(null, resp));
    } catch (error) {
      callbacks.forEach(cb => cb(error));
    }
  }

  return new class Api {
    batchSet(key, value) {
      unsavedChanges[key] = value;

      return new Promise((resolve, reject) => {
        if (timeout) {
          clearTimeout(timeout);
        }

        timeout = setTimeout(send, 200);
        pendingCallbacks.push((error, resp) => {
          if (error) {
            reject(error);
          } else {
            resolve(resp);
          }
        });
      });
    }
  };
}
