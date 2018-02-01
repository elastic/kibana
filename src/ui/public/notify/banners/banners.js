/**
 * Banners represents a prioritized list of displayed components.
 */
export class Banners {

  constructor() {
    // sorted in descending order (100, 99, 98...) so that higher priorities are in front
    this.list = [];
    this.uniqueId = 0;
    this.onChangeCallback = null;
  }

  _changed = () => {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  _replaceIfExists = bannerDetails => {
    const index = this.list.findIndex(details => details.id === bannerDetails.id);

    // we found the banner
    if (index !== -1) {
      // if its priority didn't change, then we don't need to worry about order
      if (this.list[index].priority === bannerDetails.priority) {
        this.list[index] = bannerDetails;

        return true;
      }

      // the priority did change, so we just remove it and let 'set' do its magic
      this.list.splice(index, 1);
    }

    return false;
  }

  /**
   * Set the {@code callback} to invoke whenever changes are made to the banner list.
   *
   * Use {@code null} or {@code undefined} to unset it.
   *
   * @param {Function} callback The callback to use.
   */
  onChange = callback => {
    this.onChangeCallback = callback;
  }

  /**
   * Add a new banner or replace an existing one with the optional {@code id}.
   *
   * @param {Object} component The React component to display.
   * @param {String} id The optional ID of the banner to replace.
   * @param {Number} priority The optional priority order to display this banner. Higher priority values are shown first.
   * @return {String} The supplied ID if {@code id} was not undefined. This value can be used to remove the banner.
   */
  add = ({ component, id, priority = 0 }) => {
    if (id === undefined) {
      id = `banner-${++this.uniqueId}`;
    }

    const bannerDetails = { id, component, priority };

    if (this._replaceIfExists(bannerDetails) === false) {
      // find the lowest priority item to put this banner in front of
      const index = this.list.findIndex(details => priority > details.priority);

      if (index !== -1) {
        // we found something with a lower priority; so stick it in front of that item
        this.list.splice(index, 0, bannerDetails);
      } else {
        // nothing has a lower priority, so put it at the end
        this.list.push(bannerDetails);
      }
    }

    this._changed();

    return id;
  }

  /**
   * Remove an existing banner.
   *
   * @param {String} id The ID of the banner to remove.
   * @return {Boolean} {@code true} if the ID is recognized and the banner is removed. {@code false} otherwise.
   */
  remove = id => {
    const index = this.list.findIndex(details => details.id === id);

    if (index !== -1) {
      this.list.splice(index, 1);
      this._changed();

      return true;
    }

    return false;
  }

}

/**
 * A singleton instance meant to represent all Kibana banners.
 */
export const banners = new Banners();
