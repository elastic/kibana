import errors from 'ui/errors';
export default function EnsureSomeIndexPatternsFn(Private, Notifier, $location, kbnUrl) {
  let notify = new Notifier();

  return function ensureSomeIndexPatterns() {
    return function promiseHandler(patterns) {
      if (!patterns || patterns.length === 0) {
        // notify.warning(new errors.NoDefinedIndexPatterns());
        kbnUrl.redirectPath('/management/data/index');
      }

      return patterns;
    };
  };
};
