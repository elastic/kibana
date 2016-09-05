const normal = [
  '#3b73ac',
  '#479dc6',
  '#32a7c2',
  '#45b279',
  '#3cab63',
  '#66b563',
  '#97c461',
  '#c5d558',
  '#f3eb4f',
  '#ffeb6b',
  '#fed546',
  '#f7be4f',
  '#f4a755',
  '#f29656',
  '#f08656',
  '#ec6856',
  '#eb5357',
  '#e04d70',
  '#c2458e',
  '#9e5297',
  '#6c478f',
  '#4f478f',
  '#444c92',
  '#42599b'
];
const dark = [
  '#2d5b89',
  '#287296',
  '#2e889e',
  '#259262',
  '#358a55',
  '#529659',
  '#7b9e59',
  '#9fb55a',
  '#cbc952',
  '#e1d76e',
  '#caaa52',
  '#c89951',
  '#ca8a52',
  '#c97b50',
  '#cb6f50',
  '#cd5451',
  '#c94a4f',
  '#b14458',
  '#9f4076',
  '#8a428a',
  '#5b3f7c',
  '#403f7a',
  '#3d4078',
  '#3c4b7f'
];
const light = [
  '#679ac9',
  '#67aed1',
  '#6cc2d5',
  '#82c2a3',
  '#76ba64',
  '#93c46f',
  '#b6d06f',
  '#d5de77',
  '#f6ef84',
  '#fff88e',
  '#fbe27d',
  '#ffd480',
  '#f9c57f',
  '#f6b87e',
  '#f4aa80',
  '#f0957e',
  '#ee7c7d',
  '#e8759a',
  '#cc6ea7',
  '#ab6aa2',
  '#89639e',
  '#6f65a0',
  '#636ca7',
  '#647fb3'
];

define(function () {
  /*
   * Using a random color generator presented awful colors and unpredictable color schemes.
   * So we needed to come up with a color scheme of our own that creates consistent, pleasing color patterns.
   * The order allows us to guarantee that 1st, 2nd, 3rd, etc values always get the same color.
   * Returns an array of 72 colors.
   */

  return function SeedColorUtilService() {
    return [ ...normal, ...dark, ...light ];
  };
});
