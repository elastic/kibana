import errors from 'ui/errors';
export default function EnsureSomeIndexPatternsFn(Private, Notifier, $location, kbnUrl) {
  var notify = new Notifier();

  return function ensureSomeIndexPatterns() {
    return function promiseHandler(patterns) {
      if (!patterns || patterns.length === 0) {
        // notify.warning(new errors.NoDefinedIndexPatterns());
        kbnUrl.redirectPath('/settings/indices');
      }

      return patterns;
    };
  };
};
