import { sendRequest } from './send_request';

const NOOP_CHANGES = {
  values: {},
  callback: () => {},
};

export function createUiSettingsApi() {
  let pendingChanges = null;
  let sendInProgress = false;

  async function flushPendingChanges() {
    if (!pendingChanges) {
      return;
    }

    if (sendInProgress) {
      return;
    }

    const changes = pendingChanges;
    pendingChanges = null;

    try {
      sendInProgress = true;
      changes.callback(null, await sendRequest({
        method: 'POST',
        path: '/api/kibana/settings',
        body: {
          changes: changes.values
        },
      }));
    } catch (error) {
      changes.callback(error);
    } finally {
      sendInProgress = false;
      flushPendingChanges();
    }
  }

  return new class Api {
    batchSet(key, value) {
      return new Promise((resolve, reject) => {
        const prev = pendingChanges || NOOP_CHANGES;

        pendingChanges = {
          values: {
            ...prev.values,
            [key]: value,
          },

          callback(error, resp) {
            prev.callback(error, resp);

            if (error) {
              reject(error);
            } else {
              resolve(resp);
            }
          },
        };

        flushPendingChanges();
      });
    }
  };
}
