import chrome from 'ui/chrome';

export async function sendRequest({ method, path, body }) {
  const response = await fetch(chrome.addBasePath(path), {
    method,
    body: JSON.stringify(body),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'kbn-xsrf': 'kibana',
    },
    credentials: 'same-origin'
  });

  if (response.status >= 300) {
    throw new Error(`Request failed with status code: ${response.status}`);
  }

  return await response.json();
}
