/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { EuiIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Style from 'style-it';
import { ConfirmModal } from '../confirm_modal';
import { Link } from '../link';
import { PagePreview } from '../page_preview';

import { ComponentStrings } from '../../../i18n';

const { PageManager: strings } = ComponentStrings;

export class PageManager extends React.PureComponent {
  static propTypes = {
    isWriteable: PropTypes.bool.isRequired,
    pages: PropTypes.array.isRequired,
    workpadId: PropTypes.string.isRequired,
    addPage: PropTypes.func.isRequired,
    movePage: PropTypes.func.isRequired,
    previousPage: PropTypes.func.isRequired,
    duplicatePage: PropTypes.func.isRequired,
    removePage: PropTypes.func.isRequired,
    selectedPage: PropTypes.string,
    deleteId: PropTypes.string,
    setDeleteId: PropTypes.func.isRequired,
    workpadCSS: PropTypes.string,
  };

  state = {
    showTrayPop: true,
  };

  componentDidMount() {
    // keep track of whether or not the component is mounted, to prevent rogue setState calls
    this._isMounted = true;

    // gives the tray pop animation time to finish
    setTimeout(() => {
      this.scrollToActivePage();
      this._isMounted && this.setState({ showTrayPop: false });
    }, 1000);
  }

  componentDidUpdate(prevProps) {
    // scrolls to the active page on the next tick, otherwise new pages don't scroll completely into view
    if (prevProps.selectedPage !== this.props.selectedPage) {
      setTimeout(this.scrollToActivePage, 0);
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  scrollToActivePage = () => {
    if (this.activePageRef && this.pageListRef) {
      // not all target browsers support element.scrollTo
      // TODO: replace this with something more cross-browser, maybe scrollIntoView
      if (!this.pageListRef.scrollTo) {
        return;
      }

      const pageOffset = this.activePageRef.offsetLeft;
      const {
        left: pageLeft,
        right: pageRight,
        width: pageWidth,
      } = this.activePageRef.getBoundingClientRect();
      const {
        left: listLeft,
        right: listRight,
        width: listWidth,
      } = this.pageListRef.getBoundingClientRect();

      if (pageLeft < listLeft) {
        this.pageListRef.scrollTo({
          left: pageOffset,
          behavior: 'smooth',
        });
      }
      if (pageRight > listRight) {
        this.pageListRef.scrollTo({
          left: pageOffset - listWidth + pageWidth,
          behavior: 'smooth',
        });
      }
    }
  };

  confirmDelete = pageId => {
    this._isMounted && this.props.setDeleteId(pageId);
  };

  resetDelete = () => this._isMounted && this.props.setDeleteId(null);

  doDelete = () => {
    const { previousPage, removePage, deleteId, selectedPage } = this.props;
    this.resetDelete();
    if (deleteId === selectedPage) {
      previousPage();
    }
    removePage(deleteId);
  };

  onDragEnd = ({ draggableId: pageId, source, destination }) => {
    // dropped outside the list
    if (!destination) {
      return;
    }

    const position = destination.index - source.index;

    this.props.movePage(pageId, position);
  };

  renderPage = (page, i) => {
    const {
      isWriteable,
      selectedPage,
      workpadId,
      movePage,
      duplicatePage,
      workpadCSS,
    } = this.props;
    const pageNumber = i + 1;

    return (
      <Draggable key={page.id} draggableId={page.id} index={i} isDragDisabled={!isWriteable}>
        {provided => (
          <div
            key={page.id}
            className={`canvasPageManager__page ${
              page.id === selectedPage ? 'canvasPageManager__page-isActive' : ''
            }`}
            ref={el => {
              if (page.id === selectedPage) {
                this.activePageRef = el;
              }
              provided.innerRef(el);
            }}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
          >
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="xs" className="canvasPageManager__pageNumber">
                  {pageNumber}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <Link
                  name="loadWorkpad"
                  params={{ id: workpadId, page: pageNumber }}
                  aria-label={strings.getPageNumberAriaLabel(pageNumber)}
                >
                  {Style.it(
                    workpadCSS,
                    <div>
                      <PagePreview
                        isWriteable={isWriteable}
                        page={page}
                        height={100}
                        pageNumber={pageNumber}
                        movePage={movePage}
                        selectedPage={selectedPage}
                        duplicatePage={duplicatePage}
                        confirmDelete={this.confirmDelete}
                      />
                    </div>
                  )}
                </Link>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        )}
      </Draggable>
    );
  };

  render() {
    const { pages, addPage, deleteId, isWriteable } = this.props;
    const { showTrayPop } = this.state;

    return (
      <Fragment>
        <EuiFlexGroup gutterSize="none" className="canvasPageManager">
          <EuiFlexItem className="canvasPageManager__pages">
            <DragDropContext onDragEnd={this.onDragEnd}>
              <Droppable droppableId="droppable-page-manager" direction="horizontal">
                {provided => (
                  <div
                    className={`canvasPageManager__pageList ${
                      showTrayPop ? 'canvasPageManager--trayPop' : ''
                    }`}
                    ref={el => {
                      this.pageListRef = el;
                      provided.innerRef(el);
                    }}
                    {...provided.droppableProps}
                  >
                    {pages.map(this.renderPage)}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </EuiFlexItem>
          {isWriteable && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                anchorClassName="canvasPageManager__addPageTip"
                content="Add a new page to this workpad"
                position="left"
              >
                <button onClick={addPage} className="canvasPageManager__addPage">
                  <EuiIcon color="ghost" type="plusInCircle" size="l" />
                </button>
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <ConfirmModal
          isOpen={deleteId != null}
          title="Remove Page"
          message="Are you sure you want to remove this page?"
          confirmButtonText="Remove"
          onConfirm={this.doDelete}
          onCancel={this.resetDelete}
        />
      </Fragment>
    );
  }
}
