import request from 'request';
import { fromNode as fcb } from 'bluebird';

export async function ping(url) {
  try {
    await fcb(cb => request({ url, timeout: 1000 }, cb));
    return true;
  } catch (err) {
    return false;
  }
}
