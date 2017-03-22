import React from 'react';

export function PromptForItems({ singularType, pluralType, addHref }) {
  return <div className="kuiPanel kuiPanel--centered kuiPanel--withHeader">
    <div className="kuiPromptForItems">
      <div className="kuiPromptForItems__message">
        Looks like you don&rsquo;t have any {pluralType}. Let&rsquo;s add some!
      </div>

      <div className="kuiPromptForItems__actions">
        <a
          className="kuiButton kuiButton--primary kuiButton--iconText"
          href={addHref}
        >
          <span className="kuiButton__icon kuiIcon fa-plus"></span>
          Add a {singularType}
        </a>
      </div>
    </div>
  </div>;
}

PromptForItems.propTypes = {
  singularType: React.PropTypes.string,
  pluralType: React.PropTypes.string,
  addHref: React.PropTypes.string
};
