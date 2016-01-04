define(function () {
  /*
   * Using a random color generator presented awful colors and unpredictable color schemes.
   * So we needed to come up with a color scheme of our own that creates consistent, pleasing color patterns.
   * The order allows us to guarantee that 1st, 2nd, 3rd, etc values always get the same color.
   * Returns an array of 72 colors.
   */

  return function SeedColorUtilService() {
    return [
      '#7EB26D',
      '#EAB839',
      '#6ED0E0',
      '#EF843C',
      '#E24D42',
      '#1F78C1',
      '#BA43A9',
      '#705DA0'
    ];
  };
});
