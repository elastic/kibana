import chrome from 'ui/chrome';
import { metadata } from 'ui/metadata';

export async function sendRequest({ method, path, body }) {
  chrome.loadingCount.increment();
  try {
    const response = await fetch(chrome.addBasePath(path), {
      method,
      body: JSON.stringify(body),
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'kbn-version': metadata.version,
      },
      credentials: 'same-origin'
    });

    if (response.status >= 300) {
      throw new Error(`Request failed with status code: ${response.status}`);
    }

    return await response.json();
  } finally {
    chrome.loadingCount.decrement();
  }
}
