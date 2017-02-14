
import React, {
  Component,
} from 'react';

export default class HomeView extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="guideHome">
        <div className="guideHomeSection">
          <div className="kuiHeaderBar kuiVerticalRhythm">
            <div className="kuiHeaderBarSection">
              <div className="kuiTitle">
                Watch: "detect-server-outage"
              </div>
            </div>

            <div className="kuiHeaderBarSection">
              <div className="kuiButtonGroup">
                <button className="kuiButton kuiButton--basic">
                  Edit
                </button>

                <button className="kuiButton kuiButton--danger">
                  Delete
                </button>
              </div>
            </div>
          </div>

          <div className="kuiControlledTable kuiVerticalRhythm">
            <div className="kuiToolBar">
              <div className="kuiToolBarSearch">
                <div className="kuiToolBarSearchBox">
                  <div className="kuiToolBarSearchBox__icon kuiIcon fa-search"></div>
                  <input
                    className="kuiToolBarSearchBox__input"
                    type="text"
                    placeholder="Search..."
                  />
                </div>
              </div>

              <div className="kuiToolBarSection">
                <div className="kuiButtonGroup">
                  <button className="kuiButton kuiButton--primary">
                    Add
                  </button>

                  <button className="kuiButton kuiButton--danger" disabled>
                    Delete
                  </button>
                </div>

                <div className="kuiButtonGroup">
                  <button className="kuiButton kuiButton--basic kuiButton--icon">
                    <span className="kuiButton__icon kuiIcon fa-gear"></span>
                  </button>

                  <button className="kuiButton kuiButton--basic kuiButton--icon">
                    <span className="kuiButton__icon kuiIcon fa-bars"></span>
                  </button>
                </div>
              </div>

              <div className="kuiToolBarSection">
                <div className="kuiToolBarText">
                  1 &ndash; 20 of 33
                </div>

                <div className="kuiButtonGroup kuiButtonGroup--united">
                  <button className="kuiButton kuiButton--basic kuiButton--icon">
                    <span className="kuiButton__icon kuiIcon fa-chevron-left"></span>
                  </button>
                  <button className="kuiButton kuiButton--basic kuiButton--icon">
                    <span className="kuiButton__icon kuiIcon fa-chevron-right"></span>
                  </button>
                </div>
              </div>
            </div>

            <table className="kuiTable">
              <thead>
                <tr>
                  <th className="kuiTableHeaderCell kuiTableHeaderCell--checkBox">
                    <input type="checkbox" className="kuiCheckBox" />
                  </th>
                  <th className="kuiTableHeaderCell">
                    Title
                  </th>
                  <th className="kuiTableHeaderCell">
                    Status
                  </th>
                  <th className="kuiTableHeaderCell">
                    Date created
                  </th>
                  <th className="kuiTableHeaderCell kuiTableHeaderCell--alignRight">
                    Orders of magnitude
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr className="kuiTableRow">
                  <td className="kuiTableRowCell kuiTableRowCell--checkBox">
                    <input type="checkbox" className="kuiCheckBox" />
                  </td>
                  <td className="kuiTableRowCell">
                    <a className="kuiLink" href="#">Alligator</a>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiIcon kuiIcon--success fa-check"></div>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiTableRowCell__liner">
                      Tue Dec 06 2016 12:56:15 GMT-0800 (PST)
                    </div>
                  </td>
                  <td className="kuiTableRowCell kuiTableRowCell--alignRight">
                    <div className="kuiTableRowCell__liner">
                      1
                    </div>
                  </td>
                </tr>

                <tr className="kuiTableRow">
                  <td className="kuiTableRowCell kuiTableRowCell--checkBox">
                    <input type="checkbox" className="kuiCheckBox" />
                  </td>
                  <td className="kuiTableRowCell">
                    <a className="kuiLink" href="#">Boomerang</a>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiIcon kuiIcon--success fa-check"></div>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiTableRowCell__liner">
                      Tue Dec 06 2016 12:56:15 GMT-0800 (PST)
                    </div>
                  </td>
                  <td className="kuiTableRowCell kuiTableRowCell--alignRight">
                    <div className="kuiTableRowCell__liner">
                      10
                    </div>
                  </td>
                </tr>

                <tr className="kuiTableRow">
                  <td className="kuiTableRowCell kuiTableRowCell--checkBox">
                    <input type="checkbox" className="kuiCheckBox" />
                  </td>
                  <td className="kuiTableRowCell">
                    <a className="kuiLink" href="#">Celebration</a>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiIcon kuiIcon--warning fa-bolt"></div>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiTableRowCell__liner">
                      Tue Dec 06 2016 12:56:15 GMT-0800 (PST)
                    </div>
                  </td>
                  <td className="kuiTableRowCell kuiTableRowCell--alignRight">
                    <div className="kuiTableRowCell__liner">
                      100
                    </div>
                  </td>
                </tr>

                <tr className="kuiTableRow">
                  <td className="kuiTableRowCell kuiTableRowCell--checkBox">
                    <input type="checkbox" className="kuiCheckBox" />
                  </td>
                  <td className="kuiTableRowCell">
                    <a className="kuiLink" href="#">Dog</a>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiIcon kuiIcon--error fa-warning"></div>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiTableRowCell__liner">
                      Tue Dec 06 2016 12:56:15 GMT-0800 (PST)
                    </div>
                  </td>
                  <td className="kuiTableRowCell kuiTableRowCell--alignRight">
                    <div className="kuiTableRowCell__liner">
                      1000
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="kuiToolBarFooter">
              <div className="kuiToolBarFooterSection">
                <div className="kuiToolBarText">
                  5 Items selected
                </div>
              </div>

              <div className="kuiToolBarFooterSection">
                <div className="kuiToolBarText">
                  1 &ndash; 20 of 33
                </div>

                <div className="kuiButtonGroup kuiButtonGroup--united">
                  <button className="kuiButton kuiButton--basic kuiButton--icon">
                    <span className="kuiButton__icon kuiIcon fa-chevron-left"></span>
                  </button>
                  <button className="kuiButton kuiButton--basic kuiButton--icon">
                    <span className="kuiButton__icon kuiIcon fa-chevron-right"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="guideHomeSection">
          <div className="kuiHeaderBar kuiVerticalRhythm">
            <div className="kuiHeaderBarSection">
              <div className="kuiTitle">
                Alerts
              </div>

              <div className="statusGroup">
                <span className="kuiText">
                  <strong>21</strong>
                </span>

                <span className="kuiText">
                  <span className="kuiStatusText kuiStatusText--error">
                    <span className="kuiStatusText__icon kuiIcon fa-warning"></span>
                    <strong>3</strong>
                  </span>
                </span>

                <span className="kuiText">
                  <span className="kuiStatusText kuiStatusText--warning">
                    <span className="kuiStatusText__icon kuiIcon fa-bolt"></span>
                    <strong>17</strong>
                  </span>
                </span>

                <span className="kuiText">
                  <span className="kuiStatusText kuiStatusText--info">
                    <span className="kuiStatusText__icon kuiIcon fa-info"></span>
                    <strong>1</strong>
                  </span>
                </span>
              </div>
            </div>

            <div className="kuiHeaderBarSection">
              <div className="kuiText">
                <a className="kuiLink" href="#">View all 21 alerts</a>
              </div>
            </div>
          </div>

          <div className="kuiMenu kuiMenu--contained kuiVerticalRhythm">
            <div className="kuiMenuItem">
              <div className="kuiEvent">
                <div className="kuiEventSymbol">
                  <span className="kuiIcon kuiIcon--info fa-info"></span>
                </div>

                <div className="kuiEventBody">
                  <div className="kuiEventBody__message">
                    margarine_masher_toad sitting of 1 is less than opossum of 2
                  </div>

                  <div className="kuiEventBody__metadata">
                    August 4, 2021 02:23:28
                  </div>
                </div>
              </div>
            </div>

            <div className="kuiMenuItem">
              <div className="kuiEvent">
                <div className="kuiEventSymbol">
                  <span className="kuiIcon kuiIcon--error fa-warning"></span>
                </div>

                <div className="kuiEventBody">
                  <div className="kuiEventBody__message">
                    Cluster stork is red because 17 pillory stars are unenamored
                  </div>

                  <div className="kuiEventBody__metadata">
                    August 3, 2021 12:00:54
                  </div>
                </div>
              </div>
            </div>

            <div className="kuiMenuItem">
              <div className="kuiEvent">
                <div className="kuiEventSymbol">
                  <span className="kuiIcon kuiIcon--warning fa-bolt"></span>
                </div>

                <div className="kuiEventBody">
                  <div className="kuiEventBody__message">
                    Elastic band nematode vision marshmallow directed: 50,100
                  </div>

                  <div className="kuiEventBody__metadata">
                    July 27, 2021 11:20:09
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="kuiHeaderBar kuiVerticalRhythm">
            <div className="kuiHeaderBarSection">
              <div className="kuiTitle">
                Status
              </div>
            </div>
          </div>

          <div className="kuiMenu kuiMenu--separated hideTop">
            <div className="kuiMenuItem">
              <div className="kuiBar kuiVerticalRhythm">
                <div className="kuiHeaderBarSection">
                  <h2 className="kuiSubTitle">
                    Elasticsearch
                  </h2>
                </div>

                <div className="kuiHeaderBarSection">
                  <span className="kuiText">
                    <span className="kuiStatusText kuiStatusText--error">
                      <span className="kuiStatusText__icon kuiIcon fa-circle"></span>
                      Red health
                    </span>
                  </span>
                </div>
              </div>

              <div className="statusPanel kuiVerticalRhythm">
                <div className="statusPanel__section">
                  <div className="kuiText">
                    <div><strong>Overview</strong></div>
                    <table>
                      <tbody>
                        <tr>
                          <td className="statTableRowHeader">Version</td>
                          <td>6.0.0-alpha1</td>
                        </tr>
                        <tr>
                          <td className="statTableRowHeader">Uptime</td>
                          <td>1 day</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="statusPanel__section">
                  <div className="kuiText">
                    <div><strong>Nodes (1)</strong></div>
                    <table>
                      <tbody>
                        <tr>
                          <td className="statTableRowHeader">Disk available</td>
                          <td>53GB / 233GB  (22.64%)</td>
                        </tr>
                        <tr>
                          <td className="statTableRowHeader">JVM heap</td>
                          <td>25.24%  (500MB / 2GB)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="statusPanel__section">
                  <div className="kuiText">
                    <div><strong>Indices (16)</strong></div>
                    <table>
                      <tbody>
                        <tr>
                          <td className="statTableRowHeader">Documents</td>
                          <td>598,503</td>
                        </tr>
                        <tr>
                          <td className="statTableRowHeader">Disk usage</td>
                          <td>329MB</td>
                        </tr>
                        <tr>
                          <td className="statTableRowHeader">Primary shards</td>
                          <td>16</td>
                        </tr>
                        <tr>
                          <td className="statTableRowHeader">Replica shards</td>
                          <td>0</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="kuiMenuItem">
              <div className="kuiBar kuiVerticalRhythm">
                <div className="kuiHeaderBarSection">
                  <h2 className="kuiSubTitle">
                    Kibana
                  </h2>
                </div>

                <div className="kuiHeaderBarSection">
                  <span className="kuiText">
                    <span className="kuiStatusText kuiStatusText--success">
                      <span className="kuiStatusText__icon kuiIcon fa-circle"></span>
                      Green health
                    </span>
                  </span>
                </div>
              </div>

              <div className="statusPanel kuiVerticalRhythm">
                <div className="statusPanel__section">
                  <div className="kuiText">
                    <div><strong>Overview</strong></div>
                    <table>
                      <tbody>
                        <tr>
                          <td className="statTableRowHeader">Requests</td>
                          <td>265</td>
                        </tr>
                        <tr>
                          <td className="statTableRowHeader">Max. response time</td>
                          <td>3628 ms</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="statusPanel__section">
                  <div className="kuiText">
                    <div><strong>Instances (1)</strong></div>
                    <table>
                      <tbody>
                        <tr>
                          <td className="statTableRowHeader">Connections</td>
                          <td>3</td>
                        </tr>
                        <tr>
                          <td className="statTableRowHeader">Memory usage</td>
                          <td>7.71%  (110MB / 1GB)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="statusPanel__section">

                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }
}
