/* eslint-disable */

const $tabs = $('.kuiTab');
let $selectedTab = undefined;

if (!$tabs.length) {
  throw new Error('$tabs missing');
}

function selectTab(tab) {
  if ($selectedTab) {
    $selectedTab.removeClass('kuiTab-isSelected');
  }

  $selectedTab = $(tab);
  $selectedTab.addClass('kuiTab-isSelected');
}

$tabs.on('click', event => {
  selectTab(event.target);
});

selectTab($tabs[0]);
