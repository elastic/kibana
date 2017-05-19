/* eslint-disable */

const $searchInput = $('#expandableSearchInput');
let multiLineInputValue =
  `(.es(\'"this    " AND  " that"  \', metric=sum:bytes), .es(\'foo OR bar\')).divide(.es(-foo)).multiply(100).holt(0.1,0.1,0.1,1w),

    .es(*).label(\'This is everything\')`;

$searchInput.val(multiLineInputValue);
