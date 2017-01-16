import * as React from 'react';

export class PageSizeSelector extends React.Component {
  constructor(props) {
    super(props);
  }

  getPageSizeOptions() {
    const { sizeOptions } = this.props;
    let optionElements = [];
    for (let i = 0; i < sizeOptions.length; i++) {
      const sizeOption = sizeOptions[i];
      optionElements.push(
        <option key={sizeOption.value} value={sizeOption.value}>{sizeOption.title}</option>
      );
    }
    return optionElements;
  }

  render() {
    const { onChange, perPage } = this.props;
    return (
      <form className="form-inline pagination-size">
        <div className="form-group">
          <label>Page Size</label>
          <select
              value={perPage}
              onChange={(event) => { onChange(event.target.value); }}>
            {this.getPageSizeOptions()}
          </select>
        </div>
      </form>
    );
  }
}
