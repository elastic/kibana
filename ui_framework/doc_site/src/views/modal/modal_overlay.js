/* eslint-disable */

const $showModalOverlayButton = $('[data-id="showModalOverlay"]');
const $modalOverlay = $('.kuiModalOverlay');
const $modalOverlayCloseButton = $('.kuiModalOverlay .kuiModalHeaderCloseButton');
const $modalOverlayCancelButton = $('.kuiModalOverlay .kuiButton--hollow');
const $modalOverlayConfirmButton = $('.kuiModalOverlay .kuiButton--primary');

if (!$showModalOverlayButton.length) {
  throw new Error('$showModalOverlayButton missing');
}

if (!$modalOverlay.length) {
  throw new Error('$modalOverlay missing');
}

if (!$modalOverlayCloseButton.length) {
  throw new Error('$modalOverlayCloseButton missing');
}

if (!$modalOverlayCancelButton.length) {
  throw new Error('$modalOverlayCancelButton missing');
}

if (!$modalOverlayConfirmButton.length) {
  throw new Error('$modalOverlayConfirmButton missing');
}

$modalOverlay.hide();

$showModalOverlayButton.on('click', () => {
  $modalOverlay.show();
});

$modalOverlayCloseButton.on('click', () => {
  $modalOverlay.hide();
});

$modalOverlayCancelButton.on('click', () => {
  $modalOverlay.hide();
});

$modalOverlayConfirmButton.on('click', () => {
  $modalOverlay.hide();
});
