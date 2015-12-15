define(function () {
  /*
   * Using a random color generator presented awful colors and unpredictable color schemes.
   * So we needed to come up with a color scheme of our own that creates consistent, pleasing color patterns.
   * The order allows us to guarantee that 1st, 2nd, 3rd, etc values always get the same color.
   * Returns an array of 72 colors.
   */

  return function SeedColorUtilService() {
    return [
      '#7eb26d',
      '#eab839',
      '#6ed0e0',
      '#ef843c',
      '#e24d42',
      '#1f78c1',
      '#ba43a9',
      '#705da0'
    ];
  };
});
