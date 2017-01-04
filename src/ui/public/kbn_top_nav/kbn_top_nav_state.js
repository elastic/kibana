import modules from 'ui/modules';
import angular from 'angular';

modules.get('kibana')
.service('kbnTopNavState', $rootScope => {
  let isDropdownOpen = false;
  let dropdown;
  let dropdownId;

  function closeDropdown() {
    dropdown = undefined;
    dropdownId = undefined;
    isDropdownOpen = false;
    $rootScope.$broadcast('topNavState:change');
    return isDropdownOpen;
  }

  function toggleDropdown(content, id) {
    if (id === dropdownId) {
      return closeDropdown();
    }

    dropdown = content;
    dropdownId = id;
    isDropdownOpen = !isDropdownOpen;
    $rootScope.$broadcast('topNavState:change');
    return isDropdownOpen;
  }

  return {
    closeDropdown,
    toggleDropdown,

    getOpenDropdownId: () => {
      return dropdownId;
    },

    isDropdownOpen: () => {
      return isDropdownOpen;
    },

    getDropdown: () => {
      return dropdown;
    }
  };
});
