import request from 'request';
import { fromNode as fcb } from 'bluebird';

export async function ping(url) {
  try {
    await Promise.race([
      fcb(cb => request(url, cb)),
      new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('timeout')), 1000);
      })
    ]);
    return true;
  } catch (err) {
    return false;
  }
}
