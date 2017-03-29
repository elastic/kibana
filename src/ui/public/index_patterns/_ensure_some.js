export default function EnsureSomeIndexPatternsFn(Private, Notifier, $location, kbnUrl) {
  return function ensureSomeIndexPatterns() {
    return function promiseHandler(patterns) {
      if (!patterns || patterns.length === 0) {
        // notify.warning(new errors.NoDefinedIndexPatterns());
        kbnUrl.redirectPath('/management/kibana/index');
      }

      return patterns;
    };
  };
}
