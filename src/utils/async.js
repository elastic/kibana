import Bluebird from 'bluebird';

export function makeDefer() {
  const defer = {};
  defer.promise = new Bluebird((resolve, reject) => {
    defer.resolve = resolve;
    defer.reject = reject;
  });
  return defer;
}
