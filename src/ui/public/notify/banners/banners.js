/**
 * Banners represents a prioritized list of displayed components.
 */
export class Banners {

  constructor() {
    // sorted in descending order (100, 99, 98...) so that higher priorities are in front
    this.list = [];
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

  onChange = callback => {
    this.onChangeCallback = callback;
  }

  set = ({ id, component, priority = 0 }) => {
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
  }

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
 * A singleton instance meant to represent all Kibana banners. We may want top and bottom banners in the future, at which point it would
 * be easiest to create a separate singleton.
 */
export const topBanners = new Banners();
