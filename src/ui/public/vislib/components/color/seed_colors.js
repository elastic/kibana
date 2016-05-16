const normal = [
  '#facd47',
  '#f2b04c',
  '#e8974c',
  '#df7c4e',
  '#d66050',
  '#bb677d',
  '#a06eaa',
  '#787cc0',
  '#508ad6',
  '#569aa9',
  '#5cac73',
  '#abbc5d'
];
const dark = [
  '#c8a438',
  '#c18c3c',
  '#b9783c',
  '#b2633e',
  '#ab4c40',
  '#955264',
  '#805888',
  '#606399',
  '#406eab',
  '#447b87',
  '#49895c',
  '#88964a'
];
const light = [
  '#fcdc7e',
  '#f6c882',
  '#efb682',
  '#e9a483',
  '#e39085',
  '#d095a4',
  '#bd9ac4',
  '#a1a4d3',
  '#85ade3',
  '#89b9c3',
  '#8dc59d',
  '#c5d08e'
];

define(function () {
  /*
   * Using a random color generator presented awful colors and unpredictable color schemes.
   * So we needed to come up with a color scheme of our own that creates consistent, pleasing color patterns.
   * The order allows us to guarantee that 1st, 2nd, 3rd, etc values always get the same color.
   * Returns an array of 36 colors.
   */

  return function SeedColorUtilService() {
    return [ ...normal, ...dark, ...light ];
  };
});
