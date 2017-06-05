
import $ from 'jquery';

const ID_ATTRIBUTE = 'injected-js-tag-id';

export default {

  inject(js, id) {
    if (id) {
      $(`[${ID_ATTRIBUTE}=${id}]`).remove();
    }

    const script = $(`<script ${ID_ATTRIBUTE}=${id}>${js}</script>`);
    $('body').append(script);
  },

  remove(id) {
    $(`[${ID_ATTRIBUTE}=${id}]`).remove();
  },

};
