import { connect } from 'react-redux';
import { getSections } from '../../store';
import { GuidePage } from './guide_page';

const mapStateToProps = state => ({
  sections: getSections(state),
});

export const GuidePageContainer = connect(mapStateToProps)(GuidePage);
