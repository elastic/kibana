/**
 * You should always make sure that every CATEGORY on top have a corresponding
 * display name in the below object, otherwise they won't be shown properly
 * in the vis creation wizard.
 */

const CATEGORY = {
  BASIC: 'basic',
  DATA: 'data',
  GRAPHIC: 'graphic',
  MAP: 'map',
  OTHER: 'other',
  TIME: 'time',
  // Hidden is a specific category and doesn't need a display name below
  HIDDEN: 'hidden'
};

const CATEGORY_DISPLAY_NAMES = {
  [CATEGORY.BASIC]: 'Basic Charts',
  [CATEGORY.DATA]: 'Data',
  [CATEGORY.GRAPHIC]: 'Graphic',
  [CATEGORY.MAP]: 'Maps',
  [CATEGORY.OTHER]: 'Other',
  [CATEGORY.TIME]: 'Time Series'
};

export { CATEGORY, CATEGORY_DISPLAY_NAMES };
