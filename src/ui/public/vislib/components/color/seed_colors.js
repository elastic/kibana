define(function () {
  /*
   * Using a random color generator presented awful colors and unpredictable color schemes.
   * So we needed to come up with a color scheme of our own that creates consistent, pleasing color patterns.
   * The order allows us to guarantee that 1st, 2nd, 3rd, etc values always get the same color.
   * Returns an array of 72 colors.
   */

  return function SeedColorUtilService() {
    return [
      '#57c17b',
      '#006e8a',
      '#6f87d8',
      '#663db8',
      '#bc52bc',
      '#9e3533',
      '#daa05d'
    ];
  };
});
