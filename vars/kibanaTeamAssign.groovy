def generateTeamAssignments(teamAssignmentsPath, title) {
  kibanaPipeline.bash("""
    source src/dev/ci_setup/setup_env.sh
    yarn kbn bootstrap --prefer-offline

    # Build team assignments dat file
    node scripts/generate_team_assignments.js --verbose --dest '${teamAssignmentsPath}'

    cat '${teamAssignmentsPath}'
  """, title)
}

return this
